package com.scm.order_service.services;

import com.scm.order_service.client.InventoryClient;
import com.scm.order_service.client.ShipmentClient;
import com.scm.order_service.dto.messaging.OrderPackedEvent;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.OrderRequest;
import com.scm.order_service.dto.orders.OrderResponse;
import com.scm.order_service.dto.orders.OrderItemRequest;
import com.scm.order_service.dto.orders.PagedResponse;
import com.scm.order_service.entity.Order;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.mappers.PaginationMapper;
import com.scm.order_service.messaging.OrderEventProducer;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.mappers.OrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final InventoryClient inventoryClient;
    private final ShipmentClient shipmentClient;
    private final OrderEventProducer orderEventProducer;
    private final PaginationMapper paginationMapper;


    public OrderResponse createOrder(String userId, OrderRequest orderRequest) {
        reserveInventory(orderRequest.getItems());

        Order order = orderMapper.toEntity(orderRequest);
        order.setUserId(userId);

        Order savedOrder = orderRepository.save(order);
        OrderResponse response = orderMapper.toResponse(savedOrder);

        orderEventProducer.sendOrderCreatedEvent(response);
        return response;
    }


    @KafkaListener(topics = "warehouse-order-packed", groupId = "order-service-group")
    public void handleOrderPackedEvent(OrderPackedEvent event) {
        Order order = orderRepository.findById(event.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + event.getOrderId()));
        
        order.setStatus(OrderStatus.PICKED);
        orderRepository.save(order);
        orderEventProducer.sendOrderReadyForDispatchEvent(
                new OrderReadyForDispatchEvent(order.getId(), order.getShippingAddress())
        );
    }
    
    public PagedResponse<OrderResponse> getAllOrders(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<Order> orderPage = orderRepository.findAll(pageable);

        return paginationMapper.toPagedResponse(orderPage, orderMapper::toResponse);
    }

    public PagedResponse<OrderResponse> getOrdersForUser(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<Order> orderPage = orderRepository.findByUserId(userId, pageable);
        
        return paginationMapper.toPagedResponse(orderPage, orderMapper::toResponse);
    }

    private void reserveInventory(List<OrderItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }
        List<String> failedSkus = inventoryClient.reserveBulkStock(items);

        if (failedSkus != null && !failedSkus.isEmpty()) {
            String missingItems = String.join(", ", failedSkus);
            throw new InsufficientStockException("Checkout failed. Stock unavailable for: " + missingItems);
        }
    }

}