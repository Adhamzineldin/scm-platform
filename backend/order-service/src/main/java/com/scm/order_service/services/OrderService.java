package com.scm.order_service.services;

import com.scm.order_service.client.InventoryClient;
import com.scm.order_service.client.WarehouseClient;
import com.scm.order_service.dto.messaging.OrderPackedEvent;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.OrderRequest;
import com.scm.order_service.dto.orders.OrderResponse;
import com.scm.order_service.dto.orders.OrderItemRequest;
import com.scm.order_service.dto.orders.PagedResponse;
import com.scm.order_service.dto.warehouse.OrderTaskRequest;
import com.scm.order_service.entity.Order;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.mappers.PaginationMapper;
import com.scm.order_service.messaging.OrderEventProducer;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.mappers.OrderMapper;
import com.scm.order_service.validator.OrderValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final InventoryClient inventoryClient;
    private final WarehouseClient warehouseClient;
    private final OrderEventProducer orderEventProducer;
    private final PaginationMapper paginationMapper;
    private final OrderValidator orderValidator;


    @Transactional
    public OrderResponse createOrder(String userId, OrderRequest orderRequest) {
        return orderRepository.findByUserIdAndIdempotencyKey(userId, orderRequest.getIdempotencyKey())
                .map(orderMapper::toResponse)
                .orElseGet(() -> processNewOrder(userId, orderRequest));
    }
    
    private OrderResponse processNewOrder(String userId, OrderRequest orderRequest) {
        orderValidator.validateOrder(orderRequest);
        reserveInventory(orderRequest.getItems());

        Order order = orderMapper.toEntity(orderRequest);
        order.setUserId(userId);
        order.setIdempotencyKey(orderRequest.getIdempotencyKey());
        order.setStatus(OrderStatus.VALIDATED);

        Order savedOrder = orderRepository.save(order);
        OrderResponse response = orderMapper.toResponse(savedOrder);

        createWarehouseTasks(response);
        orderEventProducer.sendOrderCreatedEvent(response);
        return response;
    }

    @Transactional
    @KafkaListener(topics = "warehouse-order-packed", groupId = "order-service-group")
    public void handleOrderPackedEvent(OrderPackedEvent event) {
        log.info("Received Kafka event: Warehouse finished packing Order ID {}", event.getOrderId());

        markOrderPicked(event.getOrderId(), event.getWorkerId());
    }

    private void transitionStatus(Order order, OrderStatus newStatus) {
        OrderStatus previous = order.getStatus();
        if (previous == newStatus) {
            return;
        }
        order.setStatus(newStatus);
        orderRepository.save(order);

        orderEventProducer.sendOrderStatusChangedEvent(
                order.getId(),
                order.getUserId(),
                previous != null ? previous.name() : null,
                newStatus.name()
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

    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + orderId));
        return orderMapper.toResponse(order);
    }

    @Transactional
    public OrderResponse markOrderPicked(Long orderId, String workerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + orderId));

        log.info("Marking Order ID {} as PICKED by worker {}", orderId, workerId);
        transitionStatus(order, OrderStatus.PICKED);

        orderEventProducer.sendOrderReadyForDispatchEvent(
                new OrderReadyForDispatchEvent(order.getId(), order.getUserId(), order.getShippingAddress())
        );

        return orderMapper.toResponse(order);
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

    private void createWarehouseTasks(OrderResponse orderResponse) {
        try {
            warehouseClient.createPickingTasks(mapWarehouseTaskRequest(orderResponse));
        } catch (feign.FeignException ex) {
            log.warn("Could not create warehouse picking tasks for order {} (HTTP {}): {}",
                    orderResponse.getId(), ex.status(), extractMessage(ex.contentUTF8()));
            // Non-fatal — order is saved; warehouse specialist assigns picking tasks later
        } catch (Exception ex) {
            log.warn("Unexpected error creating warehouse tasks for order {}: {}",
                    orderResponse.getId(), ex.getMessage());
        }
    }

    private String extractMessage(String json) {
        try {
            int idx = json.indexOf("\"message\"");
            if (idx < 0) return json;
            int colon = json.indexOf(':', idx);
            int start = json.indexOf('"', colon + 1) + 1;
            int end = json.indexOf('"', start);
            return json.substring(start, end);
        } catch (Exception e) {
            return json;
        }
    }

    private OrderTaskRequest mapWarehouseTaskRequest(OrderResponse orderResponse) {
        return OrderTaskRequest.builder()
                .orderId(orderResponse.getId())
                .userId(orderResponse.getUserId())
                .shippingAddress(orderResponse.getShippingAddress())
                .items(orderResponse.getItems().stream()
                        .map(item -> com.scm.order_service.dto.warehouse.OrderItemPayload.builder()
                                .sku(item.getSku())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .build())
                        .toList())
                .build();
    }

}
