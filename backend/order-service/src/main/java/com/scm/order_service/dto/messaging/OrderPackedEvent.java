package com.scm.order_service.dto.messaging;

import lombok.Data;

@Data
public class OrderPackedEvent {
    private Long orderId;
    private String workerId;
}