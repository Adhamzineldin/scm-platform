package com.scm.shipment_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Outbound Kafka event published to {@code shipment-dispatched-topic}.
 * Consumed by notification-service to send dispatch confirmation emails / SSE notifications.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentDispatchedEvent {
    private Long shipmentId;
    private Long orderId;
    private String userId;
    private String trackingNumber;
    private String carrier;
    private String shippingAddress;
    private String dispatchedAt;
}

