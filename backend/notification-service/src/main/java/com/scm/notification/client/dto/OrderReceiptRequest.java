package com.scm.notification.client.dto;

import com.scm.notification.dto.OrderItemPayload;

import java.util.List;

public record OrderReceiptRequest(
        Long orderId,
        String userId,
        String shippingAddress,
        String status,
        String idempotencyKey,
        String createdAt,
        List<OrderItemPayload> items
) {}
