package com.scm.notification.stream;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationStreamRegistryTest {

    @Test
    void snapshotIncludesLatestEventPerUser() {
        NotificationStreamRegistry registry = new NotificationStreamRegistry();
        InAppNotification payload = new InAppNotification(
                "SHIPMENT_DELIVERED",
                55L,
                "7",
                "Delivered",
                "Order #55 delivered",
                Instant.parse("2026-05-05T00:00:00Z")
        );

        registry.publish("7", payload);

        var snapshot = registry.snapshotLatestEvents();
        assertThat(snapshot).hasSize(1);
        assertThat(snapshot.get(0).userId()).isEqualTo("7");
        assertThat(snapshot.get(0).type()).isEqualTo("SHIPMENT_DELIVERED");
        assertThat(snapshot.get(0).orderId()).isEqualTo(55L);
    }

    @Test
    void snapshotIncludesRecentKafkaEvents() {
        NotificationStreamRegistry registry = new NotificationStreamRegistry();

        registry.recordKafkaEvent(new NotificationKafkaEventState(
                "ORDER_CREATED",
                "order-created-topic",
                "notification-service-confirmation-group",
                77L,
                "7",
                "Order #77 created with status PENDING",
                "2026-05-05T00:00:00Z",
                Instant.parse("2026-05-05T00:00:01Z")
        ));

        var snapshot = registry.snapshotKafkaEvents();
        assertThat(snapshot).hasSize(1);
        assertThat(snapshot.get(0).topic()).isEqualTo("order-created-topic");
        assertThat(snapshot.get(0).type()).isEqualTo("ORDER_CREATED");
        assertThat(snapshot.get(0).orderId()).isEqualTo(77L);
    }

    @Test
    void reRegisterKeepsOnlyOneActiveSubscriberPerUser() {
        NotificationStreamRegistry registry = new NotificationStreamRegistry();

        SseEmitter first = registry.register("7");
        SseEmitter second = registry.register("7");

        registry.publish("7", new InAppNotification(
                "ORDER_CONFIRMED",
                88L,
                "7",
                "Confirmed",
                "Order #88 confirmed",
                Instant.parse("2026-05-05T00:00:00Z")
        ));

        var snapshot = registry.snapshotLatestEvents();
        assertThat(snapshot).hasSize(1);
        assertThat(snapshot.get(0).activeSubscribers()).isEqualTo(1);
        assertThat(first).isNotSameAs(second);
    }
}

