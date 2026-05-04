package com.scm.notification.service;

import com.scm.notification.client.DocumentClient;
import com.scm.notification.client.OrderClient;
import com.scm.notification.client.UserClient;
import com.scm.notification.client.dto.OrderLookupResponse;
import com.scm.notification.dto.ShipmentDispatchedContext;
import com.scm.notification.dto.ShipmentDispatchedEvent;
import com.scm.notification.dto.UserDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDispatcherTest {

    @Mock
    private NotificationSender sender;
    @Mock
    private UserClient userClient;
    @Mock
    private OrderClient orderClient;
    @Mock
    private DocumentClient documentClient;

    @Test
    void shipmentNotificationFallsBackToOrderLookupWhenEventUserIdMissing() {
        NotificationDispatcher dispatcher = new NotificationDispatcher(List.of(sender), userClient, orderClient, documentClient);
        ShipmentDispatchedEvent event = new ShipmentDispatchedEvent(
                10L,
                22L,
                null,
                "TRK-123",
                "DHL",
                "Alexandria",
                "DELIVERED",
                "2026-05-04T12:00:00Z",
                null
        );

        when(orderClient.getOrderById(22L)).thenReturn(new OrderLookupResponse(22L, "7", "Alexandria", "DELIVERED"));
        when(userClient.getUserById(7L)).thenReturn(new UserDto(7L, "alice", "alice@demo.com", "CUSTOMER"));

        dispatcher.dispatchShipmentConfirmation(event);

        ArgumentCaptor<ShipmentDispatchedContext> captor = ArgumentCaptor.forClass(ShipmentDispatchedContext.class);
        verify(sender).sendShipmentDispatched(captor.capture());
        assertThat(captor.getValue().user().email()).isEqualTo("alice@demo.com");
        assertThat(captor.getValue().targetUserId()).isEqualTo("7");
        assertThat(captor.getValue().event().orderId()).isEqualTo(22L);
    }
}

