package com.scm.notification.stream;

import org.junit.jupiter.api.Test;

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
}

