package com.scm.order_service.dto.orders;

import com.scm.order_service.enums.OrderStatus;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderResponse {
    private Long id;
    private String userId;
    private String shippingAddress;
    private String idempotencyKey;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemResponse> items;
}