package com.scm.notification.dto;

public sealed interface NotificationContext
        permits OrderConfirmationContext, StatusUpdateContext {

    Long orderId();

    UserDto user();
}
