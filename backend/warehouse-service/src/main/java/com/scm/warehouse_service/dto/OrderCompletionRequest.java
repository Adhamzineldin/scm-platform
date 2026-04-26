package com.scm.warehouse_service.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OrderCompletionRequest {
    String workerId;
}
