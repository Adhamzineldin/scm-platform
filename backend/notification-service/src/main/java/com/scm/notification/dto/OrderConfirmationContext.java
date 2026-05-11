package com.scm.notification.dto;

public record OrderConfirmationContext(
        OrderCreatedEvent event,
        UserDto user,
        byte[] receiptPdf
) implements NotificationContext {

    @Override
    public Long orderId() {
        return event.orderId();
    }
}
