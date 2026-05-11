package com.scm.notification.stream;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class NotificationStreamRegistry {

    private static final long EMITTER_TIMEOUT_MS = 5L * 60L * 1000L;
    private static final int MAX_RECENT_KAFKA_EVENTS = 100;

    private final Map<String, SseEmitter> emittersByUser = new ConcurrentHashMap<>();
    private final Map<String, InAppNotification> latestEventByUser = new ConcurrentHashMap<>();
    private final Deque<NotificationKafkaEventState> recentKafkaEvents = new ConcurrentLinkedDeque<>();

    public SseEmitter register(String userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        SseEmitter previous = emittersByUser.put(userId, emitter);
        if (previous != null) {
            try {
                previous.complete();
            } catch (Exception ignored) {
                // Best-effort cleanup of stale SSE stream.
            }
        }

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(ex -> remove(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(userId, emitter);
        }

        log.info("SSE subscriber attached for userId={} (active={})",
                userId, emittersByUser.containsKey(userId) ? 1 : 0);
        return emitter;
    }

    public void publish(String userId, InAppNotification payload) {
        latestEventByUser.put(userId, payload);

        SseEmitter target = emittersByUser.get(userId);
        if (target == null) {
            log.debug("No active SSE subscribers for userId={}, skipping realtime push", userId);
            return;
        }
        try {
            target.send(SseEmitter.event().name(payload.type()).data(payload));
        } catch (IOException | IllegalStateException ex) {
            log.warn("Failed to push to SSE subscriber for userId={}: {}", userId, ex.getMessage());
            remove(userId, target);
        }
    }

    public void recordKafkaEvent(NotificationKafkaEventState event) {
        recentKafkaEvents.addFirst(event);
        while (recentKafkaEvents.size() > MAX_RECENT_KAFKA_EVENTS) {
            recentKafkaEvents.pollLast();
        }
    }

    @Scheduled(fixedDelay = 25_000L)
    void heartbeat() {
        emittersByUser.forEach((userId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException ex) {
                remove(userId, emitter);
            }
        });
    }

    @PreDestroy
    void shutdown() {
        emittersByUser.values().forEach(SseEmitter::complete);
        emittersByUser.clear();
        latestEventByUser.clear();
        recentKafkaEvents.clear();
    }

    public List<NotificationEventState> snapshotLatestEvents() {
        List<NotificationEventState> snapshot = new ArrayList<>();
        latestEventByUser.forEach((userId, payload) -> {
            int subscribers = emittersByUser.containsKey(userId) ? 1 : 0;
            snapshot.add(new NotificationEventState(
                    userId,
                    payload.type(),
                    payload.orderId(),
                    payload.title(),
                    payload.message(),
                    payload.timestamp(),
                    subscribers
            ));
        });
        return snapshot;
    }

    public List<NotificationKafkaEventState> snapshotKafkaEvents() {
        return List.copyOf(recentKafkaEvents);
    }

    private void remove(String userId, SseEmitter emitter) {
        emittersByUser.computeIfPresent(userId, (ignored, current) -> current == emitter ? null : current);
    }
}
