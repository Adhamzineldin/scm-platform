package com.scm.order_service.dto.messaging;
import java.math.BigDecimal;
public record OrderItemPayload(String sku, Integer quantity, BigDecimal unitPrice) {}