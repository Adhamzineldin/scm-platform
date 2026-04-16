package com.scm.order_service.dto;

import com.scm.order_service.enums.OrderStatus;
import lombok.Data;
import java.util.List;

@Data
public class OrderResponse {
    private Long id;
    private OrderStatus status;
    private List<OrderItemResponse> items;
}