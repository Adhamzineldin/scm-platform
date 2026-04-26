package com.scm.warehouse_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemPayload {
    @NotBlank(message = "SKU is required")
    private String sku;

    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private BigDecimal unitPrice;
}
