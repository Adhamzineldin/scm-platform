package com.scm.warehouse_service.dto;

import com.scm.warehouse_service.entity.ZoneType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WarehouseZoneRequest {
    @NotBlank(message = "Zone code is required")
    private String code;

    @NotBlank(message = "Zone name is required")
    private String name;

    @NotNull(message = "Zone type is required")
    private ZoneType type;

    private String description;
}
