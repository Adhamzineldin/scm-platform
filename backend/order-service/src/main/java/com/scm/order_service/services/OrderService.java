package com.scm.order_service.services;


import com.scm.order_service.dto.OrderRequest;
import com.scm.order_service.dto.OrderResponse;
import com.scm.order_service.entity.Order;
import com.scm.order_service.mappers.OrderMapper;
import com.scm.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    public OrderResponse createOrder(OrderRequest orderRequest) {
        Order order = orderMapper.toEntity(orderRequest);
        
        Order savedOrder = orderRepository.save(order);
        
        return orderMapper.toResponse(savedOrder);
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll()
                .stream()
                .map(orderMapper::toResponse) 
                .collect(Collectors.toList());
    }
}