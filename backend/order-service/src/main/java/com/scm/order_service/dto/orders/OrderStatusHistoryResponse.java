package com.scm.order_service.dto.orders;

import java.time.LocalDateTime;

public record OrderStatusHistoryResponse(
        Long id,
        Long orderId,
        String previousStatus,
        String newStatus,
        LocalDateTime changedAt,
        String changedBy,
        String note
) {}
