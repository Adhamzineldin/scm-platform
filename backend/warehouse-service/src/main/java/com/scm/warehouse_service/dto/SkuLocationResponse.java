package com.scm.warehouse_service.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SkuLocationResponse {
    Long id;
    String sku;
    String zoneCode;
    String zoneName;
    String shelfCode;
    Integer onHandQuantity;
}
