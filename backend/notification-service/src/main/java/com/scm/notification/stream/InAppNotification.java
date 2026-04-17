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
}
