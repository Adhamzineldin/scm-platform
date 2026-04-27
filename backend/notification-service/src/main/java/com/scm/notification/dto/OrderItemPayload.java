package com.scm.notification.dto;

import java.math.BigDecimal;

public record OrderItemPayload(
        String sku,
        Integer quantity,
        BigDecimal unitPrice
) {}