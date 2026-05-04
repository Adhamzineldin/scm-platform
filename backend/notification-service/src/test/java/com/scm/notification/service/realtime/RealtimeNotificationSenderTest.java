package com.scm.notification.service.realtime;

import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.ShipmentDispatchedEvent;
import com.scm.notification.dto.UserDto;
import com.scm.notification.stream.InAppNotification;
import com.scm.notification.stream.NotificationStreamRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RealtimeNotificationSenderTest {

    @Mock
    private NotificationStreamRegistry registry;

    @Test
    void sendsDeliveredRealtimeEventType() {
        RealtimeNotificationSender sender = new RealtimeNotificationSender(registry);
        ShipmentDispatchedEvent event = new ShipmentDispatchedEvent(
                10L, 20L, "1", "TRK-1", "UPS", "Alex", "DELIVERED", "2026-05-04T10:00:00Z", null
        );
        ShipmentDispatchedContext context = new ShipmentDispatchedContext(event, new UserDto(1L, "alice", "a@x.com", "CUSTOMER"), "1");

        sender.sendShipmentDispatched(context);

        ArgumentCaptor<InAppNotification> payload = ArgumentCaptor.forClass(InAppNotification.class);
        verify(registry).publish(org.mockito.ArgumentMatchers.eq("1"), payload.capture());
        assertThat(payload.getValue().type()).isEqualTo("SHIPMENT_DELIVERED");
    }

    @Test
    void sendsShippedRealtimeEventType() {
        RealtimeNotificationSender sender = new RealtimeNotificationSender(registry);
        ShipmentDispatchedEvent event = new ShipmentDispatchedEvent(
                10L, 20L, "1", "TRK-1", "UPS", "Alex", "SHIPPED", "2026-05-04T09:00:00Z", "2026-05-04T09:00:00Z"
        );
        ShipmentDispatchedContext context = new ShipmentDispatchedContext(event, new UserDto(1L, "alice", "a@x.com", "CUSTOMER"), "1");

        sender.sendShipmentDispatched(context);

        ArgumentCaptor<InAppNotification> payload = ArgumentCaptor.forClass(InAppNotification.class);
        verify(registry).publish(org.mockito.ArgumentMatchers.eq("1"), payload.capture());
        assertThat(payload.getValue().type()).isEqualTo("SHIPMENT_DISPATCHED");
    }
}

