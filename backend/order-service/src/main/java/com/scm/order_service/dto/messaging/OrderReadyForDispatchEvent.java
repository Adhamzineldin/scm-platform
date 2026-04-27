package com.scm.order_service.dto.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderReadyForDispatchEvent {
    private Long orderId;
    private String shippingAddress;
}