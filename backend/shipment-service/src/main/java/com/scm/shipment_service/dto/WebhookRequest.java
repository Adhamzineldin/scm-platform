package com.scm.shipment_service.dto;


public class WebhookRequest {
    private String trackingNumber;
    private String status;

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

