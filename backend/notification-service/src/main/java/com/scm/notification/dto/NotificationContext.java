package com.scm.notification.dto;

public sealed interface NotificationContext
        permits OrderConfirmationContext, StatusUpdateContext, ShipmentDispatchedContext {

    Long orderId();

    UserDto user();
}
