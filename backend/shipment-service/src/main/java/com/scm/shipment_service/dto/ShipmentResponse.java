package com.scm.shipment_service.dto;
public class ShipmentResponse {

    private Long id;
    private String trackingNumber;
    private String status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
