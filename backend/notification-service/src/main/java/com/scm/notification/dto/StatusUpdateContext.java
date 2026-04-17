package com.scm.notification.dto;

public record StatusUpdateContext(
        OrderStatusChangedEvent event,
        UserDto user
) implements NotificationContext {

    @Override
    public Long orderId() {
        return event.orderId();
    }
}
