package com.scm.shipment_service.entity;


import com.scm.shipment_service.model.ShipmentStatus;
import jakarta.persistence.*;

@Entity
public class Shipment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private String trackingNumber;
    private String carrier;

    @Enumerated(EnumType.STRING)
    private ShipmentStatus status;

    // ===== GETTERS & SETTERS =====

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getCarrier() {
        return carrier;
    }

    public void setCarrier(String carrier) {
        this.carrier = carrier;
    }

    public ShipmentStatus getStatus() {
        return status;
    }

    public void setStatus1(ShipmentStatus status) {
        this.status = status;
    }

    public void setStatus(ShipmentStatus shipmentStatus) {

    }
}

