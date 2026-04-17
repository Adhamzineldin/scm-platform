package com.scm.order_service.validator;

import com.scm.order_service.dto.orders.OrderRequest;
import org.springframework.stereotype.Component;


@Component
public class OrderValidator {
    
    public void validateOrder(OrderRequest orderRequest) {
        validateShippingAddress(orderRequest);
    }
    
    private void validateShippingAddress(OrderRequest orderRequest) {
        if (orderRequest.getShippingAddress() == null || orderRequest.getShippingAddress().isBlank()) {
            throw new IllegalArgumentException("Shipping address is required to place an order.");
        }
    }
}
