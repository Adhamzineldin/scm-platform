package com.scm.warehouse_service.dto;

import com.scm.warehouse_service.entity.MovementType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ItemMovementResponse {
    Long id;
    String sku;
    Integer quantity;
    String fromZoneCode;
    String fromShelfCode;
    String toZoneCode;
    String toShelfCode;
    MovementType movementType;
    Long taskId;
    String performedBy;
    LocalDateTime movedAt;
}
