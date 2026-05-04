package com.scm.notification.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.notification.dto.ShipmentDispatchedEvent;
import com.scm.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ShipmentEventListenerTest {

    @Mock
    private NotificationDispatcher dispatcher;

    @Test
    void listenerConvertsEventAndDispatchesNotification() {
        ShipmentEventListener listener = new ShipmentEventListener(dispatcher, new ObjectMapper());

        Map<String, Object> eventMap = Map.of(
                "shipmentId", 44,
                "orderId", 77,
                "userId", "1",
                "trackingNumber", "TRK-777",
                "carrier", "FedEx",
                "shippingAddress", "Cairo",
                "status", "DELIVERED",
                "statusChangedAt", "2026-05-04T17:30:00Z",
                "dispatchedAt", "2026-05-04T12:00:00Z"
        );

        listener.handleShipmentDispatched(eventMap);

        ArgumentCaptor<ShipmentDispatchedEvent> captor = ArgumentCaptor.forClass(ShipmentDispatchedEvent.class);
        verify(dispatcher).dispatchShipmentConfirmation(captor.capture());

        ShipmentDispatchedEvent event = captor.getValue();
        assertThat(event.orderId()).isEqualTo(77L);
        assertThat(event.status()).isEqualTo("DELIVERED");
        assertThat(event.trackingNumber()).isEqualTo("TRK-777");
    }
}

