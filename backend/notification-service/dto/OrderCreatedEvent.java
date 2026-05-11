package com.scm.notification.dto;

import java.util.List;

public record OrderCreatedEvent(
        Long orderId,
        String referenceNumber,
        String userId,
        String shippingAddress,
        String status,
        String idempotencyKey,
        String createdAt,
        List<OrderItemPayload> items
) {}