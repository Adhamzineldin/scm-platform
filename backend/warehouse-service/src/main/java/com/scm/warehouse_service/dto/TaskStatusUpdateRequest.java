package com.scm.warehouse_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TaskStatusUpdateRequest {
    @NotBlank(message = "Worker id is required")
    private String workerId;
}
