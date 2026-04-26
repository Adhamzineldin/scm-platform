package com.scm.warehouse_service.dto;

import com.scm.warehouse_service.entity.TaskStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class PickingTaskResponse {
    Long id;
    Long orderId;
    String sku;
    Integer quantity;
    String sourceZoneCode;
    String sourceShelfCode;
    String destinationZoneCode;
    String destinationShelfCode;
    String assignedWorkerId;
    TaskStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
