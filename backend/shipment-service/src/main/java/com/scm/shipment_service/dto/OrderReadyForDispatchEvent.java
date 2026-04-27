package com.scm.shipment_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Inbound Kafka event consumed from {@code order-ready-for-dispatch-topic}.
 * Published by order-service after an order transitions to PICKED.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderReadyForDispatchEvent {
    private Long orderId;
    private String userId;
    private String shippingAddress;
}

