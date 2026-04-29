package com.scm.order_service.services;

import com.scm.order_service.client.InventoryClient;
import com.scm.order_service.client.WarehouseClient;
import com.scm.order_service.dto.messaging.OrderPackedEvent;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.OrderRequest;
import com.scm.order_service.dto.orders.OrderResponse;
import com.scm.order_service.dto.orders.OrderItemRequest;
import com.scm.order_service.dto.orders.OrderStatusHistoryResponse;
import com.scm.order_service.dto.orders.PagedResponse;
import com.scm.order_service.dto.warehouse.OrderTaskRequest;
import com.scm.order_service.entity.Order;
import com.scm.order_service.entity.OrderStatusHistory;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.mappers.PaginationMapper;
import com.scm.order_service.messaging.OrderEventProducer;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.repository.OrderStatusHistoryRepository;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
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

        historyRepository.save(new OrderStatusHistory(
                savedOrder.getId(), null, OrderStatus.VALIDATED.name(),
                savedOrder.getCreatedAt(), userId, "Order placed"));

        // Run Kafka publish and warehouse task creation after the transaction commits.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try { orderEventProducer.sendOrderCreatedEvent(response); }
                catch (Exception ex) { log.error("Kafka publish failed for order {}: {}", response.getId(), ex.getMessage()); }
                createWarehouseTasks(response);
            }
        });

        return response;
    }

    @Transactional
    @KafkaListener(topics = "warehouse-order-packed", groupId = "order-service-group")
    public void handleOrderPackedEvent(OrderPackedEvent event) {
        log.info("Received Kafka event: Warehouse finished packing Order ID {}", event.getOrderId());

        markOrderPicked(event.getOrderId(), event.getWorkerId());
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

    public List<OrderStatusHistoryResponse> getOrderHistory(Long orderId) {
        return historyRepository.findByOrderIdOrderByChangedAtAsc(orderId).stream()
                .map(h -> new OrderStatusHistoryResponse(
                        h.getId(), h.getOrderId(), h.getPreviousStatus(), h.getNewStatus(),
                        h.getChangedAt(), h.getChangedBy(), h.getNote()))
                .toList();
    }

    @Transactional
    public OrderResponse markOrderPicked(Long orderId, String workerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with ID: " + orderId));

        log.info("Marking Order ID {} as PICKED by worker {}", orderId, workerId);

        String previousStatus = order.getStatus() != null ? order.getStatus().name() : null;
        order.setStatus(OrderStatus.PICKED);
        orderRepository.save(order);

        historyRepository.save(new OrderStatusHistory(
                orderId, previousStatus, OrderStatus.PICKED.name(),
                LocalDateTime.now(), workerId, "Warehouse picking complete"));

        OrderResponse response = orderMapper.toResponse(order);

        // Send Kafka events after the transaction commits so the updated status is visible to consumers.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                orderEventProducer.sendOrderStatusChangedEvent(orderId, order.getUserId(), previousStatus, OrderStatus.PICKED.name());
                orderEventProducer.sendOrderReadyForDispatchEvent(
                        new OrderReadyForDispatchEvent(order.getId(), order.getUserId(), order.getShippingAddress())
                );
            }
        });

        return response;
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
            log.info("Picking tasks created in warehouse-service for order {}", orderResponse.getId());
        } catch (feign.FeignException ex) {
            log.error("Could not create warehouse picking tasks for order {} (HTTP {}): {} — order is VALIDATED but has NO picking tasks until manually backfilled.",
                    orderResponse.getId(), ex.status(), extractMessage(ex.contentUTF8()));
        } catch (Exception ex) {
            log.error("Unexpected error creating warehouse tasks for order {}: {}",
                    orderResponse.getId(), ex.getMessage(), ex);
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
