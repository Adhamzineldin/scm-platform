package com.scm.order_service.dto.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderReadyForDispatchEvent {
    private Long orderId;
    private String userId;
    private String shippingAddress;
}