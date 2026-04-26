package com.scm.shipment_service.dto;

/**
 * Request DTO for creating a dispatch record.
 */
public class DispatchRequest {

    private String pickupLocation;
    private String deliveryAddress;
    private String notes;

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}