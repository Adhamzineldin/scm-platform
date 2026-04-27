package com.scm.cart.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckoutRequest {

    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    /**
     * Optional client-supplied idempotency key. If null, the cart-service
     * will generate one before forwarding to order-service.
     */
    private String idempotencyKey;
}

