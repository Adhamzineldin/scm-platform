package com.scm.order_service.client;

import com.scm.order_service.dto.orders.OrderResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "warehouse-service")
public interface WarehouseClient {
    @PostMapping("/api/warehouse/tasks")
    void createPickingTask(@RequestBody OrderResponse orderDetails);
}