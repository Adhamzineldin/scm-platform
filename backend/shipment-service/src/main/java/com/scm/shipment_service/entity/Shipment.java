package com.scm.shipment_service.entity;

import com.scm.shipment_service.model.ShipmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Shipment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private String userId;
    private String trackingNumber;
    private String carrier;
    private String shippingAddress;

    @Enumerated(EnumType.STRING)
    private ShipmentStatus status;
}
