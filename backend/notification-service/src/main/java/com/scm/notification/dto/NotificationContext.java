package com.scm.notification.dto;

public record NotificationContext(
        OrderCreatedEvent event,
        UserDto user
) {}
