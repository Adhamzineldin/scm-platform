package com.scm.order_service.client;

import com.scm.order_service.dto.warehouse.OrderTaskRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "warehouse-service", url = "${warehouse.service.url:http://localhost:2504}")
public interface WarehouseClient {
    @PostMapping("/api/warehouse/tasks")
    void createPickingTasks(@RequestBody OrderTaskRequest orderDetails);
}
