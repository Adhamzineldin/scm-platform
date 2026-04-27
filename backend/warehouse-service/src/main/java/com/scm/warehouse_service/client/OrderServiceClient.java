package com.scm.warehouse_service.client;

import com.scm.warehouse_service.dto.OrderCompletionRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "order-service", url = "${order.service.url:http://localhost:2501}")
public interface OrderServiceClient {
    @PatchMapping("/api/orders/{orderId}/warehouse-complete")
    void markWarehouseComplete(@PathVariable("orderId") Long orderId, @RequestBody OrderCompletionRequest request);
}
