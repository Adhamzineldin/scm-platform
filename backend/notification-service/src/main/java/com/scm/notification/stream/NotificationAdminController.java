package com.scm.notification.stream;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/notifications/admin")
@RequiredArgsConstructor
public class NotificationAdminController {

    private final NotificationStreamRegistry registry;

    @GetMapping("/event-state")
    public NotificationAdminSnapshot getLatestEventState(
            @RequestParam(value = "kafkaPage", defaultValue = "0") int kafkaPage,
            @RequestParam(value = "kafkaSize", defaultValue = "20") int kafkaSize,
            @RequestParam(value = "ssePage", defaultValue = "0") int ssePage,
            @RequestParam(value = "sseSize", defaultValue = "20") int sseSize
    ) {
        List<NotificationKafkaEventState> kafkaSorted = registry.snapshotKafkaEvents().stream()
                .sorted(Comparator.comparing(NotificationKafkaEventState::consumedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<NotificationEventState> sseSorted = registry.snapshotLatestEvents().stream()
                .sorted(Comparator.comparing(NotificationEventState::timestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        return new NotificationAdminSnapshot(
                page(kafkaSorted, kafkaPage, kafkaSize),
                page(sseSorted, ssePage, sseSize)
        );
    }

    private static <T> List<T> page(List<T> data, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int from = safePage * safeSize;
        if (from >= data.size()) {
            return List.of();
        }
        int to = Math.min(data.size(), from + safeSize);
        return data.subList(from, to);
    }
}

