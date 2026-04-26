package com.scm.order_service.dto.warehouse;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class OrderItemPayload {
    String sku;
    Integer quantity;
    BigDecimal unitPrice;
}
