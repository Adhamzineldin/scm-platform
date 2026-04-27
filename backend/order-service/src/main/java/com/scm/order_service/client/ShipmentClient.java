package com.scm.order_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "shipment-service")
public interface ShipmentClient {
    @PostMapping("/api/shipments/dispatch")
    void dispatchOrder(@RequestParam("orderId") Long orderId);
}