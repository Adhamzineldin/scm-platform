package com.scm.order_service.controllers;

import com.scm.order_service.dto.orders.OrderRequest;
import com.scm.order_service.dto.orders.OrderResponse;
import com.scm.order_service.dto.orders.PagedResponse;
import com.scm.order_service.services.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor 
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody OrderRequest orderRequest) {

        return orderService.createOrder(userId, orderRequest);
    }

    @ResponseStatus(HttpStatus.OK)
    public PagedResponse<OrderResponse> getOrders(
            @RequestParam(value = "page", defaultValue = "0", required = false) int page,
            @RequestParam(value = "size", defaultValue = "10", required = false) int size) {

        return orderService.getAllOrders(page, size);
    }

    @GetMapping("/my-orders")
    @ResponseStatus(HttpStatus.OK)
    public PagedResponse<OrderResponse> getMyOrders(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(value = "page", defaultValue = "0", required = false) int page,
            @RequestParam(value = "size", defaultValue = "10", required = false) int size) {

        return orderService.getOrdersForUser(userId, page, size);
    }
}