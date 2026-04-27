package com.scm.cart.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Minimal mirror of order-service {@code OrderResponse} — the cart only needs
 * {@code id} + {@code status} to confirm checkout.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderResponse {
    private Long id;
    private String userId;
    private String shippingAddress;
    private String idempotencyKey;
    private String status;
    private LocalDateTime createdAt;
}

