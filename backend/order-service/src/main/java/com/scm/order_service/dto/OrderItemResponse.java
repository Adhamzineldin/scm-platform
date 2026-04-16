package com.scm.order_service.dto;

import lombok.Data;

@Data
public class OrderItemResponse {
    private String sku;
    private Integer quantity;
}