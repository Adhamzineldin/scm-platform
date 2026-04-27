package com.scm.warehouse_service.dto;

import com.scm.warehouse_service.entity.ZoneType;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class WarehouseZoneResponse {
    Long id;
    String code;
    String name;
    ZoneType type;
    String description;
    boolean active;
}
