package com.scm.order_service.client;

import com.scm.order_service.dto.orders.OrderItemRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "inventory-service")
public interface InventoryClient {

    @GetMapping("/api/inventory/check")
    boolean checkStock(@RequestParam("sku") String sku, @RequestParam("quantity") Integer quantity);

    @PostMapping("/api/inventory/bulk-check")
    List<String> checkBulkStock(@RequestBody List<OrderItemRequest> items);

    @PostMapping("/api/inventory/bulk-reserve")
    List<String> reserveBulkStock(@RequestBody List<OrderItemRequest> items);
    
}