package com.scm.shipment_service.service;

import com.scm.shipment_service.dto.DispatchRequest;
import com.scm.shipment_service.entity.DispatchRecord;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.entity.ShipmentHistory;
import com.scm.shipment_service.exception.NotFoundException;
import com.scm.shipment_service.model.ShipmentStatus;
import com.scm.shipment_service.repository.DispatchRecordRepository;
import com.scm.shipment_service.repository.ShipmentHistoryRepository;
import com.scm.shipment_service.repository.ShipmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShipmentService {

    private final ShipmentRepository repo;
    private final CarrierService carrier;
    private final DispatchRecordRepository dispatchRepo;
    private final ShipmentHistoryRepository historyRepo;

    public ShipmentService(ShipmentRepository repo, CarrierService carrier,
                           DispatchRecordRepository dispatchRepo,
                           ShipmentHistoryRepository historyRepo) {
        this.repo = repo;
        this.carrier = carrier;
        this.dispatchRepo = dispatchRepo;
        this.historyRepo = historyRepo;
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

    @Transactional
    public Shipment dispatch(Long id, DispatchRequest request) {
        Shipment s = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));

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
        recordHistory(saved, ShipmentStatus.PENDING, ShipmentStatus.SHIPPED, "SYSTEM",
                "Shipment dispatched to carrier: " + res.get("carrier"));

        return saved;
    }

    public void updateStatus(String tracking, String status) {
        Shipment s = repo.findByTrackingNumber(tracking)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));

        ShipmentStatus oldStatus = s.getStatus();
        ShipmentStatus newStatus = ShipmentStatus.valueOf(status);

        s.setStatus(newStatus);
        repo.save(s);

        // Record history
        recordHistory(s, oldStatus, newStatus, "WEBHOOK", "Status updated via webhook");
    }

    /**
     * Get shipment details with dispatch records and history.
     */
    public Shipment getDetails(Long id) {
        Shipment s = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Shipment not found"));
        return s;
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
}