package com.scm.order_service.dto.orders;

import lombok.Data;

@Data
public class OrderItemRequest {
    private String sku;
    private Integer quantity;
}