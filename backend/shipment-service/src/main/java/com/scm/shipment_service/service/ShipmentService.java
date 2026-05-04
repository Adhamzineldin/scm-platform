package com.scm.shipment_service.service;

import com.scm.shipment_service.dto.DispatchRequest;
import com.scm.shipment_service.dto.ShipmentDispatchedEvent;
import com.scm.shipment_service.entity.DispatchRecord;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.entity.ShipmentHistory;
import com.scm.shipment_service.exception.NotFoundException;
import com.scm.shipment_service.model.ShipmentStatus;
import com.scm.shipment_service.repository.DispatchRecordRepository;
import com.scm.shipment_service.repository.ShipmentHistoryRepository;
import com.scm.shipment_service.repository.ShipmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class ShipmentService {

    private static final String SHIPMENT_TOPIC = "shipment-dispatched-topic";

    private final ShipmentRepository repo;
    private final CarrierService carrier;
    private final DispatchRecordRepository dispatchRepo;
    private final ShipmentHistoryRepository historyRepo;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ShipmentService(ShipmentRepository repo, CarrierService carrier,
                           DispatchRecordRepository dispatchRepo,
                           ShipmentHistoryRepository historyRepo,
                           KafkaTemplate<String, Object> kafkaTemplate) {
        this.repo = repo;
        this.carrier = carrier;
        this.dispatchRepo = dispatchRepo;
        this.historyRepo = historyRepo;
        this.kafkaTemplate = kafkaTemplate;
    }

    public Shipment create(Long orderId) {
        Shipment s = new Shipment();
        s.setOrderId(orderId);
        s.setStatus(ShipmentStatus.PENDING);
        Shipment saved = repo.save(s);

        // Record initial history
        recordHistory(saved, null, ShipmentStatus.PENDING, "SYSTEM", "Initial shipment created");

        return saved;
    }

    /**
     * Create a shipment from a Kafka {@code order-ready-for-dispatch-topic} event,
     * persisting the userId + shippingAddress so we can notify the customer later.
     */
    @Transactional
    public Shipment createForOrder(Long orderId, String userId, String shippingAddress) {
        Shipment s = new Shipment();
        s.setOrderId(orderId);
        s.setUserId(userId);
        s.setShippingAddress(shippingAddress);
        s.setStatus(ShipmentStatus.PENDING);
        Shipment saved = repo.save(s);

        recordHistory(saved, null, ShipmentStatus.PENDING, "SYSTEM-KAFKA",
                "Shipment auto-created from order-ready-for-dispatch event");
        return saved;
    }

    /**
     * Auto-dispatch a freshly created shipment via the carrier service. Used by the
     * Kafka listener path so we don't require an explicit DispatchRequest from a UI.
     */
    @Transactional
    public Shipment autoDispatch(Shipment s) {
        ShipmentStatus previous = s.getStatus();
        var res = carrier.send(s);
        s.setTrackingNumber(res.get("trackingNumber"));
        s.setCarrier(res.get("carrier"));
        s.setStatus(ShipmentStatus.SHIPPED);
        Shipment saved = repo.save(s);

        DispatchRecord dispatch = new DispatchRecord();
        dispatch.setShipment(saved);
        dispatch.setDispatchedAt(LocalDateTime.now());
        dispatch.setCarrierName(res.get("carrier"));
        dispatch.setCarrierReference(res.get("trackingNumber"));
        dispatch.setPickupLocation("WAREHOUSE");
        dispatch.setDeliveryAddress(saved.getShippingAddress());
        dispatch.setNotes("Auto-dispatched from order-ready-for-dispatch event");
        dispatchRepo.save(dispatch);

        recordHistory(saved, previous, ShipmentStatus.SHIPPED, "SYSTEM-KAFKA",
                "Auto-dispatched to carrier: " + res.get("carrier"));
        publishShipmentStatusEvent(saved, ShipmentStatus.SHIPPED);
        return saved;
    }

    @Transactional
    public Shipment dispatch(Long id, DispatchRequest request) {
        Shipment s = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));

        ShipmentStatus previous = s.getStatus();

        var res = carrier.send(s);
        s.setTrackingNumber(res.get("trackingNumber"));
        s.setCarrier(res.get("carrier"));
        s.setStatus(ShipmentStatus.SHIPPED);
        Shipment saved = repo.save(s);

        // Create dispatch record
        DispatchRecord dispatch = new DispatchRecord();
        dispatch.setShipment(saved);
        dispatch.setDispatchedAt(LocalDateTime.now());
        dispatch.setCarrierName(res.get("carrier"));
        dispatch.setCarrierReference(res.get("trackingNumber"));
        dispatch.setPickupLocation(request.getPickupLocation());
        dispatch.setDeliveryAddress(request.getDeliveryAddress());
        dispatch.setNotes(request.getNotes());
        dispatchRepo.save(dispatch);

        // Record history
        recordHistory(saved, previous, ShipmentStatus.SHIPPED, "SYSTEM",
                "Shipment dispatched to carrier: " + res.get("carrier"));

        publishShipmentStatusEvent(saved, ShipmentStatus.SHIPPED);

        return saved;
    }

    @Transactional
    public Shipment advanceStatus(Long id, ShipmentStatus newStatus, String changedBy, String note) {
        Shipment s = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));

        ShipmentStatus current = s.getStatus();

        boolean valid = (current == ShipmentStatus.SHIPPED && newStatus == ShipmentStatus.IN_TRANSIT)
                || (current == ShipmentStatus.IN_TRANSIT && newStatus == ShipmentStatus.DELIVERED);

        if (!valid) {
            throw new IllegalArgumentException(
                    "Cannot advance shipment from " + current + " to " + newStatus);
        }

        s.setStatus(newStatus);
        Shipment saved = repo.save(s);

        String description = note != null && !note.isBlank() ? note : "Manual status update";
        recordHistory(saved, current, newStatus, changedBy, description);

        publishShipmentStatusEvent(saved, newStatus);

        return saved;
    }

    public void updateStatus(String tracking, String status) {
        Shipment s = repo.findByTrackingNumber(tracking)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));

        ShipmentStatus oldStatus = s.getStatus();
        ShipmentStatus newStatus = parseStatus(status);

        if (oldStatus == newStatus) {
            return;
        }

        s.setStatus(newStatus);
        Shipment saved = repo.save(s);

        // Record history
        recordHistory(s, oldStatus, newStatus, "WEBHOOK", "Status updated via webhook");

        publishShipmentStatusEvent(saved, newStatus);
    }

    public ShipmentStatus parseStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new IllegalArgumentException("Shipment status is required");
        }

        String normalized = rawStatus.trim().toUpperCase();
        if ("DISPATCHED".equals(normalized)) {
            normalized = "SHIPPED";
        }

        try {
            return ShipmentStatus.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported shipment status: " + rawStatus);
        }
    }

    /**
     * Get shipment details with dispatch records and history.
     */
    public Shipment getDetails(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));
    }

    /**
     * Get all dispatch records for a shipment.
     */
    public List<DispatchRecord> getDispatchHistory(Long shipmentId) {
        return dispatchRepo.findByShipmentId(shipmentId);
    }

    /**
     * Get current dispatch record for a shipment.
     */
    public DispatchRecord getCurrentDispatch(Long shipmentId) {
        return dispatchRepo.findTopByShipmentIdOrderByDispatchedAtDesc(shipmentId)
                .orElse(null);
    }

    /**
     * Get status history for a shipment.
     */
    public List<ShipmentHistory> getStatusHistory(Long shipmentId) {
        return historyRepo.findByShipmentIdOrderByChangedAtDesc(shipmentId);
    }

    /**
     * Record a status change in history.
     */
    private void recordHistory(Shipment shipment, ShipmentStatus previousStatus,
                               ShipmentStatus newStatus, String changedBy, String description) {
        ShipmentHistory history = new ShipmentHistory();
        history.setShipment(shipment);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setChangedAt(LocalDateTime.now());
        history.setChangedBy(changedBy);
        history.setDescription(description);
        historyRepo.save(history);
    }

    private void publishShipmentStatusEvent(Shipment shipment, ShipmentStatus newStatus) {
        if (newStatus != ShipmentStatus.SHIPPED && newStatus != ShipmentStatus.DELIVERED) {
            return;
        }

        String changedAt = Instant.now().toString();
        ShipmentDispatchedEvent payload = new ShipmentDispatchedEvent(
                shipment.getId(),
                shipment.getOrderId(),
                shipment.getUserId(),
                shipment.getTrackingNumber(),
                shipment.getCarrier(),
                shipment.getShippingAddress(),
                newStatus.name(),
                changedAt,
                newStatus == ShipmentStatus.SHIPPED ? changedAt : null
        );

        try {
            kafkaTemplate.send(SHIPMENT_TOPIC, String.valueOf(shipment.getId()), payload);
            log.info("Published shipment status event for shipment #{}: {}", shipment.getId(), newStatus);
        } catch (Exception ex) {
            log.error("Failed to publish shipment status event for shipment #{}: {}",
                    shipment.getId(), ex.getMessage(), ex);
        }
    }
}