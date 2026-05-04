package com.scm.notification.dto;

/**
 * Realtime + email context for "shipment dispatched" notifications.
 * Built from the inbound {@link ShipmentDispatchedEvent} consumed off
 * {@code shipment-dispatched-topic}.
 */
public record ShipmentDispatchedContext(
        ShipmentDispatchedEvent event,
        UserDto user,
        String targetUserId
) implements NotificationContext {

    @Override
    public Long orderId() {
        return event.orderId();
    }
}

