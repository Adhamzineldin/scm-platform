package com.scm.notification.stream;

import java.time.Instant;

public record NotificationEventState(
        String userId,
        String type,
        Long orderId,
        String title,
        String message,
        Instant timestamp,
        int activeSubscribers
) {
}

