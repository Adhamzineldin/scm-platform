package com.scm.notification.client;

import com.scm.notification.client.dto.OrderLookupResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "order-service")
public interface OrderClient {

    @GetMapping("/api/orders/{orderId}")
    OrderLookupResponse getOrderById(@PathVariable Long orderId);
}

