package com.scm.shipment_service.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ShipmentResponse {

    private Long id;
    private Long orderId;
    private String userId;
    private String trackingNumber;
    private String carrier;
    private String shippingAddress;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
