package com.scm.order_service.dto.messaging;
import java.util.List;
public record OrderCreatedEvent(
        Long orderId, String userId, String shippingAddress, String status, 
        String idempotencyKey, String createdAt, List<OrderItemPayload> items
) {}