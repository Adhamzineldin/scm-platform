package com.scm.notification.stream;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/notifications/admin")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final NotificationStreamRegistry registry;

    @GetMapping("/event-state")
    public List<NotificationEventState> getLatestEventState() {
        return registry.snapshotLatestEvents().stream()
                .sorted(Comparator.comparing(NotificationEventState::timestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }
}

