package com.scm.order_service.dto.warehouse;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class OrderTaskRequest {
    Long orderId;
    String userId;
    String shippingAddress;
    List<OrderItemPayload> items;
}
