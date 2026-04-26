package com.scm.shipment_service.dto;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Detailed shipment response with tracking information.
 */
public class ShipmentDetailResponse {

    private Long id;
    private Long orderId;
    private String trackingNumber;
    private String status;
    private String carrier;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Dispatch information
    private DispatchRecordDto currentDispatch;

    // Status history
    private List<ShipmentHistoryDto> history;

    // ===== GETTERS & SETTERS =====

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public DispatchRecordDto getCurrentDispatch() { return currentDispatch; }
    public void setCurrentDispatch(DispatchRecordDto currentDispatch) { this.currentDispatch = currentDispatch; }

    public List<ShipmentHistoryDto> getHistory() { return history; }
    public void setHistory(List<ShipmentHistoryDto> history) { this.history = history; }

    // ===== Nested DTOs =====

    public static class DispatchRecordDto {
        private Long id;
        private LocalDateTime dispatchedAt;
        private String carrierName;
        private String carrierReference;
        private String pickupLocation;
        private String deliveryAddress;
        private String notes;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public LocalDateTime getDispatchedAt() { return dispatchedAt; }
        public void setDispatchedAt(LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }

        public String getCarrierName() { return carrierName; }
        public void setCarrierName(String carrierName) { this.carrierName = carrierName; }

        public String getCarrierReference() { return carrierReference; }
        public void setCarrierReference(String carrierReference) { this.carrierReference = carrierReference; }

        public String getPickupLocation() { return pickupLocation; }
        public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

        public String getDeliveryAddress() { return deliveryAddress; }
        public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    public static class ShipmentHistoryDto {
        private Long id;
        private String previousStatus;
        private String newStatus;
        private LocalDateTime changedAt;
        private String changedBy;
        private String location;
        private String description;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getPreviousStatus() { return previousStatus; }
        public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

        public String getNewStatus() { return newStatus; }
        public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

        public LocalDateTime getChangedAt() { return changedAt; }
        public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }

        public String getChangedBy() { return changedBy; }
        public void setChangedBy(String changedBy) { this.changedBy = changedBy; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
}
