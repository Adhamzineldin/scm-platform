package com.scm.order_service.dto.orders;

import lombok.Data;

@Data
public class OrderItemResponse {
    private String sku;
    private Integer quantity;
}