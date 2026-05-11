package com.scm.notification.stream;

import java.util.List;

public record NotificationAdminSnapshot(
        List<NotificationKafkaEventState> kafkaEvents,
        List<NotificationEventState> sseEvents
) {
}
