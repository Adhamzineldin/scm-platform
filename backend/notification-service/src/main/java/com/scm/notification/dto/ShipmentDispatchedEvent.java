package com.scm.notification.dto;

/**
 * Inbound Kafka event consumed from {@code shipment-dispatched-topic}.
 * Published by shipment-service when an auto-dispatched shipment is created.
 */
public record ShipmentDispatchedEvent(
        Long shipmentId,
        Long orderId,
        String userId,
        String trackingNumber,
        String carrier,
        String shippingAddress,
        String status,
        String statusChangedAt,
        String dispatchedAt
) {
}

