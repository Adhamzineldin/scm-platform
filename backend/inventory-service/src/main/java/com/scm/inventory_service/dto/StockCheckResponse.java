package com.scm.inventory_service.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class StockCheckResponse {
    String sku;
    Integer requestedQuantity;
    Integer availableQuantity;
    boolean inStock;
}
