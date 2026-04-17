package com.scm.notification.dto;

public record OrderStatusChangedEvent(
        Long orderId,
        String userId,
        String previousStatus,
        String newStatus,
        String changedAt
) {}
