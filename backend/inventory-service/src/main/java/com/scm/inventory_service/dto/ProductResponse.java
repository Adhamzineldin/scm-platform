package com.scm.inventory_service.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class ProductResponse {
    Long id;
    String sku;
    String name;
    String description;
    Integer quantity;
    BigDecimal unitPrice;
    Integer reorderLevel;
    boolean lowStock;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
