package com.scm.notification.stream;

import java.time.Instant;

public record InAppNotification(
        String type,
        Long orderId,
        String userId,
        String title,
        String message,
        Instant timestamp
) {
    public static InAppNotification orderConfirmed(Long orderId, String userId) {
        return new InAppNotification(
                "ORDER_CONFIRMED",
                orderId,
                userId,
                "Order #" + orderId + " confirmed",
                "Your order has been placed and is being processed.",
                Instant.now()
        );
    }

    public static InAppNotification statusUpdate(Long orderId, String userId, String newStatus) {
        return new InAppNotification(
                "ORDER_STATUS_UPDATED",
                orderId,
                userId,
                "Order #" + orderId + " is now " + newStatus,
                "Status changed to " + newStatus + ".",
                Instant.now()
        );
    }

    public static InAppNotification shipmentDispatched(Long orderId, String userId,
                                                       String trackingNumber, String carrier) {
        return shipmentStatusUpdated(orderId, userId, "SHIPPED", trackingNumber, carrier);
    }

    public static InAppNotification shipmentStatusUpdated(Long orderId, String userId,
                                                          String status, String trackingNumber, String carrier) {
        boolean delivered = "DELIVERED".equalsIgnoreCase(status);
        return new InAppNotification(
                delivered ? "SHIPMENT_DELIVERED" : "SHIPMENT_DISPATCHED",
                orderId,
                userId,
                delivered ? "Order #" + orderId + " has been delivered" : "Order #" + orderId + " has shipped",
                delivered
                        ? "Your package was delivered. Tracking #" + trackingNumber
                        : "Carrier " + carrier + " — tracking #" + trackingNumber,
                Instant.now()
        );
    }
}
