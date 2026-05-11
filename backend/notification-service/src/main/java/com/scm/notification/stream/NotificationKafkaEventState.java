package com.scm.notification.stream;

import java.time.Instant;

public record NotificationKafkaEventState(
        String type,
        String topic,
        String consumerGroup,
        Long orderId,
        String userId,
        String summary,
        String eventTimestamp,
        Instant consumedAt
) {
}
