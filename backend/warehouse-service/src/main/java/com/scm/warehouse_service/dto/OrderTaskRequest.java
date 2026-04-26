package com.scm.warehouse_service.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class OrderTaskRequest {
    @NotNull(message = "Order id is required")
    @JsonAlias("id")
    private Long orderId;

    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    private String userId;

    @NotEmpty(message = "Order items are required")
    @Valid
    private List<OrderItemPayload> items;
}
