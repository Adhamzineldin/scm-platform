package com.scm.warehouse_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SkuLocationRequest {
    @NotBlank(message = "SKU is required")
    private String sku;

    @NotBlank(message = "Zone code is required")
    private String zoneCode;

    @NotBlank(message = "Shelf code is required")
    private String shelfCode;

    @NotNull(message = "On hand quantity is required")
    private Integer onHandQuantity;
}
