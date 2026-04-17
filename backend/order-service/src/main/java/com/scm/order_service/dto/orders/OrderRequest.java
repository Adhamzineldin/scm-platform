package com.scm.order_service.dto.orders;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {

    @NotBlank(message = "Idempotency key is required to prevent duplicate orders")
    private String idempotencyKey;
    
    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    @Valid
    @NotEmpty(message = "Order must contain at least one item")
    private List<OrderItemRequest> items;
}