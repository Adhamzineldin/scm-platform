package com.scm.notification.stream;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;

@RestController
@RequestMapping("/api/notifications/admin")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final NotificationStreamRegistry registry;

    @GetMapping("/event-state")
    public NotificationAdminSnapshot getLatestEventState() {
        return new NotificationAdminSnapshot(
                registry.snapshotKafkaEvents().stream()
                        .sorted(Comparator.comparing(NotificationKafkaEventState::consumedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                        .toList(),
                registry.snapshotLatestEvents().stream()
                        .sorted(Comparator.comparing(NotificationEventState::timestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                        .toList()
        );
    }
}

