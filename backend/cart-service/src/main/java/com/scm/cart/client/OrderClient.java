package com.scm.cart.client;

import com.scm.cart.dto.external.OrderRequest;
import com.scm.cart.dto.external.OrderResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Calls order-service synchronously to convert a cart into an order.
 * The X-User-Id header is forwarded by the gateway after JWT validation.
 */
@FeignClient(name = "order-service")
public interface OrderClient {

    @PostMapping("/api/orders")
    OrderResponse createOrder(@RequestBody OrderRequest request,
                              @RequestHeader("X-User-Id") String userId);
}

