package com.scm.order_service.dto.messaging;

public record OrderStatusChangedEvent(
        Long orderId,
        String userId,
        String previousStatus,
        String newStatus,
        String changedAt
) {}
