package com.scm.warehouse_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PickingTaskRequest {
    @NotNull(message = "Order id is required")
    private Long orderId;

    @NotBlank(message = "SKU is required")
    private String sku;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotBlank(message = "Destination zone code is required")
    private String destinationZoneCode;

    private String assignedWorkerId;
}
