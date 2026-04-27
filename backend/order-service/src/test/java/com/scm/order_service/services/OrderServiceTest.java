package com.scm.order_service.services;

import com.scm.order_service.client.InventoryClient;
import com.scm.order_service.dto.messaging.OrderPackedEvent;
import com.scm.order_service.dto.messaging.OrderReadyForDispatchEvent;
import com.scm.order_service.dto.orders.*;
import com.scm.order_service.entity.Order;
import com.scm.order_service.entity.OrderItem;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.mappers.OrderMapper;
import com.scm.order_service.mappers.PaginationMapper;
import com.scm.order_service.messaging.OrderEventProducer;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.validator.OrderValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private InventoryClient inventoryClient;
    @Mock private com.scm.order_service.client.WarehouseClient warehouseClient;
    @Mock private OrderEventProducer orderEventProducer;
    @Mock private PaginationMapper paginationMapper;
    @Mock private OrderValidator orderValidator;

    @InjectMocks
    private OrderService orderService;

    private OrderRequest orderRequest;
    private Order order;
    private OrderResponse orderResponse;

    @BeforeEach
    void setUp() {
        OrderItemRequest itemRequest = new OrderItemRequest();
        itemRequest.setSku("SKU-001");
        itemRequest.setQuantity(2);
        itemRequest.setUnitPrice(BigDecimal.valueOf(9.99));

        orderRequest = new OrderRequest();
        orderRequest.setIdempotencyKey("idem-key-123");
        orderRequest.setShippingAddress("123 Main St");
        orderRequest.setItems(List.of(itemRequest));

        OrderItem orderItem = new OrderItem();
        orderItem.setId(UUID.randomUUID());
        orderItem.setSku("SKU-001");
        orderItem.setQuantity(2);

        order = new Order();
        order.setId(1L);
        order.setUserId("user-1");
        order.setStatus(OrderStatus.CREATED);
        order.setShippingAddress("123 Main St");
        order.setIdempotencyKey("idem-key-123");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.addItem(orderItem);

        OrderItemResponse itemResponse = new OrderItemResponse();
        itemResponse.setSku("SKU-001");
        itemResponse.setQuantity(2);

        orderResponse = new OrderResponse();
        orderResponse.setId(1L);
        orderResponse.setUserId("user-1");
        orderResponse.setStatus(OrderStatus.VALIDATED);
        orderResponse.setShippingAddress("123 Main St");
        orderResponse.setIdempotencyKey("idem-key-123");
        orderResponse.setCreatedAt(LocalDateTime.now());
        orderResponse.setUpdatedAt(LocalDateTime.now());
        orderResponse.setItems(List.of(itemResponse));
    }

    // ===================== createOrder Tests =====================

    @Nested
    @DisplayName("createOrder")
    class CreateOrder {

        @Test
        @DisplayName("should create a new order successfully")
        void shouldCreateNewOrder() {
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());
            when(inventoryClient.reserveBulkStock(anyList())).thenReturn(Collections.emptyList());
            when(orderMapper.toEntity(orderRequest)).thenReturn(order);
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            OrderResponse result = orderService.createOrder("user-1", orderRequest);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getUserId()).isEqualTo("user-1");
            assertThat(result.getStatus()).isEqualTo(OrderStatus.VALIDATED);

            verify(orderValidator).validateOrder(orderRequest);
            verify(inventoryClient).reserveBulkStock(orderRequest.getItems());
            verify(orderRepository).save(order);
            verify(warehouseClient).createPickingTasks(any());
            verify(orderEventProducer).sendOrderCreatedEvent(orderResponse);
        }

        @Test
        @DisplayName("should return existing order when idempotency key matches (duplicate request)")
        void shouldReturnExistingOrderOnDuplicateIdempotencyKey() {
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.of(order));
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            OrderResponse result = orderService.createOrder("user-1", orderRequest);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);

            verify(inventoryClient, never()).reserveBulkStock(anyList());
            verify(orderRepository, never()).save(any());
            verify(warehouseClient, never()).createPickingTasks(any());
            verify(orderEventProducer, never()).sendOrderCreatedEvent(any());
        }

        @Test
        @DisplayName("should throw InsufficientStockException when inventory reservation fails")
        void shouldThrowWhenInventoryReservationFails() {
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());
            when(inventoryClient.reserveBulkStock(anyList())).thenReturn(List.of("SKU-001"));

            assertThatThrownBy(() -> orderService.createOrder("user-1", orderRequest))
                    .isInstanceOf(InsufficientStockException.class)
                    .hasMessageContaining("SKU-001");

            verify(orderRepository, never()).save(any());
            verify(warehouseClient, never()).createPickingTasks(any());
            verify(orderEventProducer, never()).sendOrderCreatedEvent(any());
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when items list is null")
        void shouldThrowWhenItemsNull() {
            orderRequest.setItems(null);
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.createOrder("user-1", orderRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("at least one item");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when items list is empty")
        void shouldThrowWhenItemsEmpty() {
            orderRequest.setItems(Collections.emptyList());
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.createOrder("user-1", orderRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("at least one item");
        }

        @Test
        @DisplayName("should set userId on the order entity before saving")
        void shouldSetUserIdOnEntity() {
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());
            when(inventoryClient.reserveBulkStock(anyList())).thenReturn(Collections.emptyList());
            when(orderMapper.toEntity(orderRequest)).thenReturn(order);
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            orderService.createOrder("user-1", orderRequest);

            assertThat(order.getUserId()).isEqualTo("user-1");
        }

        @Test
        @DisplayName("should publish Kafka event after successful order creation")
        void shouldPublishKafkaEvent() {
            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());
            when(inventoryClient.reserveBulkStock(anyList())).thenReturn(Collections.emptyList());
            when(orderMapper.toEntity(orderRequest)).thenReturn(order);
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            orderService.createOrder("user-1", orderRequest);

            ArgumentCaptor<OrderResponse> captor = ArgumentCaptor.forClass(OrderResponse.class);
            verify(warehouseClient).createPickingTasks(any());
            verify(orderEventProducer).sendOrderCreatedEvent(captor.capture());
            assertThat(captor.getValue().getId()).isEqualTo(1L);
            assertThat(captor.getValue().getStatus()).isEqualTo(OrderStatus.VALIDATED);
        }

        @Test
        @DisplayName("should handle multiple items in a single order")
        void shouldHandleMultipleItems() {
            OrderItemRequest item1 = new OrderItemRequest();
            item1.setSku("SKU-001");
            item1.setQuantity(2);
            item1.setUnitPrice(BigDecimal.ONE);
            OrderItemRequest item2 = new OrderItemRequest();
            item2.setSku("SKU-002");
            item2.setQuantity(5);
            item2.setUnitPrice(BigDecimal.ONE);
            orderRequest.setItems(List.of(item1, item2));

            when(orderRepository.findByUserIdAndIdempotencyKey("user-1", "idem-key-123"))
                    .thenReturn(Optional.empty());
            when(inventoryClient.reserveBulkStock(anyList())).thenReturn(Collections.emptyList());
            when(orderMapper.toEntity(orderRequest)).thenReturn(order);
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            OrderResponse result = orderService.createOrder("user-1", orderRequest);

            assertThat(result).isNotNull();
            verify(inventoryClient).reserveBulkStock(argThat(items -> items.size() == 2));
            verify(warehouseClient).createPickingTasks(any());
        }
    }

    // ===================== handleOrderPackedEvent Tests =====================

    @Nested
    @DisplayName("handleOrderPackedEvent")
    class HandleOrderPackedEvent {

        @Test
        @DisplayName("should update order status to PICKED and publish dispatch event")
        void shouldUpdateStatusAndPublishEvent() {
            OrderPackedEvent event = new OrderPackedEvent();
            event.setOrderId(1L);
            event.setWorkerId("worker-1");

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            orderService.handleOrderPackedEvent(event);

            assertThat(order.getStatus()).isEqualTo(OrderStatus.PICKED);
            verify(orderRepository).save(order);

            ArgumentCaptor<OrderReadyForDispatchEvent> captor =
                    ArgumentCaptor.forClass(OrderReadyForDispatchEvent.class);
            verify(orderEventProducer).sendOrderReadyForDispatchEvent(captor.capture());

            OrderReadyForDispatchEvent dispatchEvent = captor.getValue();
            assertThat(dispatchEvent.getOrderId()).isEqualTo(1L);
            assertThat(dispatchEvent.getShippingAddress()).isEqualTo("123 Main St");
        }

        @Test
        @DisplayName("should throw RuntimeException when order not found")
        void shouldThrowWhenOrderNotFound() {
            OrderPackedEvent event = new OrderPackedEvent();
            event.setOrderId(999L);
            event.setWorkerId("worker-1");

            when(orderRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.handleOrderPackedEvent(event))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Order not found with ID: 999");
        }
    }

    @Nested
    @DisplayName("markOrderPicked")
    class MarkOrderPicked {

        @Test
        @DisplayName("should update order status and return mapped response")
        void shouldMarkOrderPicked() {
            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(orderRepository.save(order)).thenReturn(order);
            when(orderMapper.toResponse(order)).thenReturn(orderResponse);

            OrderResponse result = orderService.markOrderPicked(1L, "worker-2");

            assertThat(result).isEqualTo(orderResponse);
            assertThat(order.getStatus()).isEqualTo(OrderStatus.PICKED);
            verify(orderEventProducer).sendOrderReadyForDispatchEvent(any(OrderReadyForDispatchEvent.class));
        }
    }

    // ===================== getAllOrders Tests =====================

    @Nested
    @DisplayName("getAllOrders")
    class GetAllOrders {

        @Test
        @DisplayName("should return paginated orders sorted by id descending")
        void shouldReturnPaginatedOrders() {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());
            Page<Order> orderPage = new PageImpl<>(List.of(order), pageable, 1);
            PagedResponse<OrderResponse> expectedResponse = PagedResponse.<OrderResponse>builder()
                    .content(List.of(orderResponse))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1)
                    .totalPages(1)
                    .isLast(true)
                    .build();

            when(orderRepository.findAll(pageable)).thenReturn(orderPage);
            doReturn(expectedResponse).when(paginationMapper).toPagedResponse(eq(orderPage), any());

            PagedResponse<OrderResponse> result = orderService.getAllOrders(0, 10);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.isLast()).isTrue();
        }

        @Test
        @DisplayName("should return empty page when no orders exist")
        void shouldReturnEmptyPage() {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());
            Page<Order> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            PagedResponse<OrderResponse> emptyResponse = PagedResponse.<OrderResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0)
                    .totalPages(0)
                    .isLast(true)
                    .build();

            when(orderRepository.findAll(pageable)).thenReturn(emptyPage);
            doReturn(emptyResponse).when(paginationMapper).toPagedResponse(eq(emptyPage), any());

            PagedResponse<OrderResponse> result = orderService.getAllOrders(0, 10);

            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }
    }

    // ===================== getOrdersForUser Tests =====================

    @Nested
    @DisplayName("getOrdersForUser")
    class GetOrdersForUser {

        @Test
        @DisplayName("should return only orders belonging to the specified user")
        void shouldReturnUserOrders() {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());
            Page<Order> userOrderPage = new PageImpl<>(List.of(order), pageable, 1);
            PagedResponse<OrderResponse> expectedResponse = PagedResponse.<OrderResponse>builder()
                    .content(List.of(orderResponse))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1)
                    .totalPages(1)
                    .isLast(true)
                    .build();

            when(orderRepository.findByUserId("user-1", pageable)).thenReturn(userOrderPage);
            doReturn(expectedResponse).when(paginationMapper).toPagedResponse(eq(userOrderPage), any());

            PagedResponse<OrderResponse> result = orderService.getOrdersForUser("user-1", 0, 10);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getUserId()).isEqualTo("user-1");
        }

        @Test
        @DisplayName("should return empty page when user has no orders")
        void shouldReturnEmptyForUserWithNoOrders() {
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());
            Page<Order> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            PagedResponse<OrderResponse> emptyResponse = PagedResponse.<OrderResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0)
                    .totalPages(0)
                    .isLast(true)
                    .build();

            when(orderRepository.findByUserId("unknown-user", pageable)).thenReturn(emptyPage);
            doReturn(emptyResponse).when(paginationMapper).toPagedResponse(eq(emptyPage), any());

            PagedResponse<OrderResponse> result = orderService.getOrdersForUser("unknown-user", 0, 10);

            assertThat(result.getContent()).isEmpty();
        }
    }
}
