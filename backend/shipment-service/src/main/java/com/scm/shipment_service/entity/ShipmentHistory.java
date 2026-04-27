package com.scm.shipment_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity for tracking shipment status changes over time.
 * Provides audit trail for logistics management.
 */
@Entity
public class ShipmentHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id", nullable = false)
    private Shipment shipment;

    @Enumerated(EnumType.STRING)
    private com.scm.shipment_service.model.ShipmentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    private com.scm.shipment_service.model.ShipmentStatus newStatus;

    private LocalDateTime changedAt;
    private String changedBy;
    private String location;
    private String description;

    // ===== GETTERS & SETTERS =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Shipment getShipment() {
        return shipment;
    }

    public void setShipment(Shipment shipment) {
        this.shipment = shipment;
    }

    public com.scm.shipment_service.model.ShipmentStatus getPreviousStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(com.scm.shipment_service.model.ShipmentStatus previousStatus) {
        this.previousStatus = previousStatus;
    }

    public com.scm.shipment_service.model.ShipmentStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(com.scm.shipment_service.model.ShipmentStatus newStatus) {
        this.newStatus = newStatus;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(String changedBy) {
        this.changedBy = changedBy;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}