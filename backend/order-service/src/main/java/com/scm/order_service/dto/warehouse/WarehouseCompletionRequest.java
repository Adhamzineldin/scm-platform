package com.scm.order_service.dto.warehouse;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WarehouseCompletionRequest {
    @NotBlank(message = "Worker id is required")
    private String workerId;
}
