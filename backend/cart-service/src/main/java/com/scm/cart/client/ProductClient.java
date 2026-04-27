package com.scm.cart.client;

import com.scm.cart.dto.external.ProductResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service")
public interface ProductClient {

    @GetMapping("/api/products/{id}")
    ProductResponse getProductById(@PathVariable Long id);

    @GetMapping("/api/products/sku/{sku}")
    ProductResponse getProductBySku(@PathVariable String sku);
}
