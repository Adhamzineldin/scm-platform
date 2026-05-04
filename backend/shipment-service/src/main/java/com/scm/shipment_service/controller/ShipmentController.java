package com.scm.shipment_service.controller;

import com.scm.shipment_service.dto.DispatchRequest;
import com.scm.shipment_service.dto.ShipmentDetailResponse;
import com.scm.shipment_service.dto.ShipmentRequest;
import com.scm.shipment_service.dto.ShipmentResponse;
import com.scm.shipment_service.dto.StatusAdvanceRequest;
import com.scm.shipment_service.model.ShipmentStatus;
import com.scm.shipment_service.entity.DispatchRecord;
import com.scm.shipment_service.entity.Shipment;
import com.scm.shipment_service.entity.ShipmentHistory;
import com.scm.shipment_service.mapper.ShipmentMapper;
import com.scm.shipment_service.service.ShipmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shipments")
public class ShipmentController {

    private final ShipmentService service;
    private final com.scm.shipment_service.repository.ShipmentRepository repo;

    public ShipmentController(ShipmentService service,
                              com.scm.shipment_service.repository.ShipmentRepository repo) {
        this.service = service;
        this.repo = repo;
    }

    /**
     * Create a new shipment for an order.
     */
    @PostMapping
    public ShipmentResponse create(@RequestBody ShipmentRequest req) {
        return ShipmentMapper.toResponse(service.create(req.getOrderId()));
    }

    /**
     * Look up the shipment associated with a given order (returns 404 if none).
     */
    @GetMapping("/by-order/{orderId}")
    public ShipmentDetailResponse getByOrder(@PathVariable Long orderId) {
        Shipment shipment = repo.findFirstByOrderIdOrderByIdDesc(orderId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "No shipment for order " + orderId));
        return mapToDetailResponse(shipment);
    }

    /**
     * List all shipments (paginated). Used by the dashboard.
     */
    @GetMapping
    public org.springframework.data.domain.Page<ShipmentResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return repo.findAll(org.springframework.data.domain.PageRequest.of(
                page, size, org.springframework.data.domain.Sort.by("id").descending()))
                .map(ShipmentMapper::toResponse);
    }

    /**
     * Dispatch a shipment to carrier with tracking.
     */
    @PostMapping("/{id}/dispatch")
    public ShipmentResponse dispatch(@PathVariable Long id, @RequestBody DispatchRequest req) {
        return ShipmentMapper.toResponse(service.dispatch(id, req));
    }

    /**
     * Manually advance shipment status: SHIPPED → IN_TRANSIT or IN_TRANSIT → DELIVERED.
     */
    @PatchMapping("/{id}/status")
    public ShipmentResponse advanceStatus(
            @PathVariable Long id,
            @RequestBody StatusAdvanceRequest req,
            @RequestHeader(value = "X-User-Id", defaultValue = "SYSTEM") String userId) {
        ShipmentStatus newStatus = service.parseStatus(req.getStatus());
        return ShipmentMapper.toResponse(service.advanceStatus(id, newStatus, userId, req.getNote()));
    }

    /**
     * Get detailed shipment information with tracking and history.
     */
    @GetMapping("/{id}")
    public ShipmentDetailResponse getDetails(@PathVariable Long id) {
        Shipment shipment = service.getDetails(id);
        return mapToDetailResponse(shipment);
    }

    /**
     * Get dispatch history for a shipment.
     */
    @GetMapping("/{id}/dispatches")
    public List<ShipmentDetailResponse.DispatchRecordDto> getDispatchHistory(@PathVariable Long id) {
        List<DispatchRecord> dispatches = service.getDispatchHistory(id);
        return dispatches.stream()
                .map(this::mapToDispatchDto)
                .collect(Collectors.toList());
    }

    /**
     * Get status history for a shipment.
     */
    @GetMapping("/{id}/history")
    public List<ShipmentDetailResponse.ShipmentHistoryDto> getStatusHistory(@PathVariable Long id) {
        List<ShipmentHistory> history = service.getStatusHistory(id);
        return history.stream()
                .map(this::mapToHistoryDto)
                .collect(Collectors.toList());
    }

    /**
     * Get current dispatch status.
     */
    @GetMapping("/{id}/tracking")
    public ShipmentDetailResponse.DispatchRecordDto getCurrentDispatch(@PathVariable Long id) {
        DispatchRecord dispatch = service.getCurrentDispatch(id);
        return dispatch != null ? mapToDispatchDto(dispatch) : null;
    }

    // ===== Mapping Helper Methods =====

    private ShipmentDetailResponse mapToDetailResponse(Shipment shipment) {
        ShipmentDetailResponse response = new ShipmentDetailResponse();
        response.setId(shipment.getId());
        response.setOrderId(shipment.getOrderId());
        response.setTrackingNumber(shipment.getTrackingNumber());
        response.setStatus(shipment.getStatus() != null ? shipment.getStatus().name() : null);
        response.setCarrier(shipment.getCarrier());
        response.setCreatedAt(shipment.getCreatedAt());
        response.setUpdatedAt(shipment.getUpdatedAt());

        // Get current dispatch
        DispatchRecord dispatch = service.getCurrentDispatch(shipment.getId());
        if (dispatch != null) {
            response.setCurrentDispatch(mapToDispatchDto(dispatch));
        }

        // Get history
        List<ShipmentHistory> history = service.getStatusHistory(shipment.getId());
        response.setHistory(history.stream()
                .map(this::mapToHistoryDto)
                .collect(Collectors.toList()));

        return response;
    }

    private ShipmentDetailResponse.DispatchRecordDto mapToDispatchDto(DispatchRecord dispatch) {
        ShipmentDetailResponse.DispatchRecordDto dto = new ShipmentDetailResponse.DispatchRecordDto();
        dto.setId(dispatch.getId());
        dto.setDispatchedAt(dispatch.getDispatchedAt());
        dto.setCarrierName(dispatch.getCarrierName());
        dto.setCarrierReference(dispatch.getCarrierReference());
        dto.setPickupLocation(dispatch.getPickupLocation());
        dto.setDeliveryAddress(dispatch.getDeliveryAddress());
        dto.setNotes(dispatch.getNotes());
        return dto;
    }

    private ShipmentDetailResponse.ShipmentHistoryDto mapToHistoryDto(ShipmentHistory history) {
        ShipmentDetailResponse.ShipmentHistoryDto dto = new ShipmentDetailResponse.ShipmentHistoryDto();
        dto.setId(history.getId());
        dto.setPreviousStatus(history.getPreviousStatus() != null ? history.getPreviousStatus().name() : null);
        dto.setNewStatus(history.getNewStatus() != null ? history.getNewStatus().name() : null);
        dto.setChangedAt(history.getChangedAt());
        dto.setChangedBy(history.getChangedBy());
        dto.setLocation(history.getLocation());
        dto.setDescription(history.getDescription());
        return dto;
    }
}