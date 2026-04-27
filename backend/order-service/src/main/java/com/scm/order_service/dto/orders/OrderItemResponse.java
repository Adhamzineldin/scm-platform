package com.scm.order_service.dto.orders;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemResponse {
    private String sku;
    private Integer quantity;
    private BigDecimal unitPrice;

}