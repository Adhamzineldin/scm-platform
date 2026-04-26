package com.scm.order_service.load;

import com.scm.order_service.client.InventoryClient;
import com.scm.order_service.client.WarehouseClient;
import com.scm.order_service.dto.orders.*;
import com.scm.order_service.entity.Order;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.mappers.OrderMapper;
import com.scm.order_service.mappers.PaginationMapper;
import com.scm.order_service.messaging.OrderEventProducer;
import com.scm.order_service.repository.OrderRepository;
import com.scm.order_service.services.OrderService;
import com.scm.order_service.validator.OrderValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceLoadTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private InventoryClient inventoryClient;
    @Mock private WarehouseClient warehouseClient;
    @Mock private OrderEventProducer orderEventProducer;
    @Mock private PaginationMapper paginationMapper;
    @Mock private OrderValidator orderValidator;

    @InjectMocks
    private OrderService orderService;

    private final AtomicLong idGenerator = new AtomicLong(1);

    @BeforeEach
    void setUp() {
        idGenerator.set(1);
    }

    private OrderRequest buildRequest(String idempotencyKey) {
        OrderItemRequest item = new OrderItemRequest();
        item.setSku("SKU-LOAD-" + UUID.randomUUID().toString().substring(0, 8));
        item.setQuantity(1);
        item.setUnitPrice(BigDecimal.ONE);

        OrderRequest request = new OrderRequest();
        request.setIdempotencyKey(idempotencyKey);
        request.setShippingAddress("Load Test Address");
        request.setItems(List.of(item));
        return request;
    }

    private Order buildOrder(Long id) {
        Order order = new Order();
        order.setId(id);
        order.setUserId("load-user");
        order.setStatus(OrderStatus.CREATED);
        order.setShippingAddress("Load Test Address");
        order.setIdempotencyKey("key-" + id);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        return order;
    }

    private OrderResponse buildResponseFromOrder(Order o) {
        OrderResponse response = new OrderResponse();
        response.setId(o.getId());
        response.setUserId(o.getUserId());
        response.setStatus(o.getStatus());
        response.setShippingAddress(o.getShippingAddress());
        response.setIdempotencyKey(o.getIdempotencyKey());
        response.setCreatedAt(o.getCreatedAt());
        response.setUpdatedAt(o.getUpdatedAt());
        response.setItems(Collections.emptyList());
        return response;
    }

    private OrderResponse stubOrderResponse(long id, OrderStatus status) {
        OrderResponse response = new OrderResponse();
        response.setId(id);
        response.setUserId("load-user");
        response.setStatus(status);
        response.setShippingAddress("Load Test Address");
        response.setIdempotencyKey("key-" + id);
        response.setCreatedAt(LocalDateTime.now());
        response.setUpdatedAt(LocalDateTime.now());
        response.setItems(Collections.emptyList());
        return response;
    }

    // ===================== Concurrent Order Creation =====================

    @Test
    @DisplayName("LOAD: 100 concurrent order creations should all succeed")
    void shouldHandle100ConcurrentOrderCreations() throws Exception {
        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Long> responseTimes = Collections.synchronizedList(new ArrayList<>());

        when(orderRepository.findByUserIdAndIdempotencyKey(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(inventoryClient.reserveBulkStock(anyList()))
                .thenReturn(Collections.emptyList());
        when(orderMapper.toEntity(any(OrderRequest.class))).thenAnswer(invocation -> {
            long id = idGenerator.getAndIncrement();
            return buildOrder(id);
        });
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            return buildResponseFromOrder(o);
        });

        Instant start = Instant.now();

        List<Future<OrderResponse>> futures = IntStream.range(0, threadCount)
                .mapToObj(i -> executor.submit(() -> {
                    try {
                        long t0 = System.nanoTime();
                        OrderResponse result = orderService.createOrder(
                                "user-" + i, buildRequest("key-" + i));
                        long elapsed = (System.nanoTime() - t0) / 1_000_000;
                        responseTimes.add(elapsed);
                        successCount.incrementAndGet();
                        return result;
                    } catch (Exception e) {
                        failureCount.incrementAndGet();
                        return null;
                    } finally {
                        latch.countDown();
                    }
                }))
                .toList();

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        Duration totalDuration = Duration.between(start, Instant.now());

        System.out.println("=== LOAD TEST: Concurrent Order Creation ===");
        System.out.println("Total requests:     " + threadCount);
        System.out.println("Successful:         " + successCount.get());
        System.out.println("Failed:             " + failureCount.get());
        System.out.println("Total duration:     " + totalDuration.toMillis() + " ms");
        if (!responseTimes.isEmpty()) {
            Collections.sort(responseTimes);
            System.out.println("Avg response time:  " + responseTimes.stream().mapToLong(l -> l).average().orElse(0) + " ms");
            System.out.println("P50 response time:  " + responseTimes.get(responseTimes.size() / 2) + " ms");
            System.out.println("P95 response time:  " + responseTimes.get((int) (responseTimes.size() * 0.95)) + " ms");
            System.out.println("P99 response time:  " + responseTimes.get((int) (responseTimes.size() * 0.99)) + " ms");
            System.out.println("Max response time:  " + responseTimes.get(responseTimes.size() - 1) + " ms");
        }

        assertThat(successCount.get()).isEqualTo(threadCount);
        assertThat(failureCount.get()).isZero();
    }

    // ===================== Idempotency Under Concurrent Duplicate Requests =====================

    @Test
    @DisplayName("LOAD: concurrent duplicate requests with same idempotency key should be safe")
    void shouldHandleConcurrentDuplicateRequests() throws Exception {
        int threadCount = 50;
        String sharedKey = "shared-idem-key";
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        List<Long> responseIds = Collections.synchronizedList(new ArrayList<>());

        Order existingOrder = buildOrder(42L);
        existingOrder.setStatus(OrderStatus.VALIDATED);
        OrderResponse existingResponse = stubOrderResponse(42L, OrderStatus.VALIDATED);

        // First call creates, subsequent calls find existing
        when(orderRepository.findByUserIdAndIdempotencyKey("user-1", sharedKey))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existingOrder));
        when(inventoryClient.reserveBulkStock(anyList()))
                .thenReturn(Collections.emptyList());
        when(orderMapper.toEntity(any(OrderRequest.class))).thenReturn(existingOrder);
        when(orderRepository.save(any(Order.class))).thenReturn(existingOrder);
        when(orderMapper.toResponse(any(Order.class))).thenReturn(existingResponse);

        IntStream.range(0, threadCount).forEach(i ->
                executor.submit(() -> {
                    try {
                        OrderResponse result = orderService.createOrder("user-1", buildRequest(sharedKey));
                        if (result != null) {
                            responseIds.add(result.getId());
                            successCount.incrementAndGet();
                        }
                    } catch (Exception ignored) {
                    } finally {
                        latch.countDown();
                    }
                })
        );

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        System.out.println("=== LOAD TEST: Idempotency Under Concurrency ===");
        System.out.println("Total requests:  " + threadCount);
        System.out.println("Successful:      " + successCount.get());
        System.out.println("All returned same order ID: " + responseIds.stream().allMatch(id -> id == 42L));

        assertThat(successCount.get()).isEqualTo(threadCount);
        assertThat(responseIds).allMatch(id -> id == 42L);
    }

    // ===================== Pagination Under Load =====================

    @Test
    @DisplayName("LOAD: 200 concurrent paginated queries should all succeed")
    void shouldHandleConcurrentPaginatedQueries() throws Exception {
        int threadCount = 200;
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        PagedResponse<OrderResponse> mockResponse = PagedResponse.<OrderResponse>builder()
                .content(List.of(stubOrderResponse(1L, OrderStatus.CREATED), stubOrderResponse(2L, OrderStatus.CREATED)))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(2)
                .totalPages(1)
                .isLast(true)
                .build();

        when(orderRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(buildOrder(1L), buildOrder(2L))));
        doReturn(mockResponse).when(paginationMapper).toPagedResponse(any(), any());

        Instant start = Instant.now();

        IntStream.range(0, threadCount).forEach(i ->
                executor.submit(() -> {
                    try {
                        PagedResponse<OrderResponse> result = orderService.getAllOrders(0, 10);
                        if (result != null && result.getContent().size() == 2) {
                            successCount.incrementAndGet();
                        } else {
                            failureCount.incrementAndGet();
                        }
                    } catch (Exception e) {
                        failureCount.incrementAndGet();
                    } finally {
                        latch.countDown();
                    }
                })
        );

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        Duration totalDuration = Duration.between(start, Instant.now());

        System.out.println("=== LOAD TEST: Concurrent Pagination ===");
        System.out.println("Total requests:  " + threadCount);
        System.out.println("Successful:      " + successCount.get());
        System.out.println("Failed:          " + failureCount.get());
        System.out.println("Total duration:  " + totalDuration.toMillis() + " ms");

        assertThat(successCount.get()).isEqualTo(threadCount);
        assertThat(failureCount.get()).isZero();
    }

    // ===================== Mixed Workload (Reads + Writes) =====================

    @Test
    @DisplayName("LOAD: mixed read/write workload should handle gracefully")
    void shouldHandleMixedWorkload() throws Exception {
        int writeCount = 50;
        int readCount = 150;
        int totalCount = writeCount + readCount;
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(totalCount);
        AtomicInteger writeSuccess = new AtomicInteger(0);
        AtomicInteger readSuccess = new AtomicInteger(0);
        AtomicInteger failures = new AtomicInteger(0);

        // Setup write mocks
        when(orderRepository.findByUserIdAndIdempotencyKey(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(inventoryClient.reserveBulkStock(anyList()))
                .thenReturn(Collections.emptyList());
        when(orderMapper.toEntity(any(OrderRequest.class))).thenAnswer(invocation -> {
            long id = idGenerator.getAndIncrement();
            return buildOrder(id);
        });
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            return buildResponseFromOrder(o);
        });

        // Setup read mocks
        PagedResponse<OrderResponse> mockPagedResponse = PagedResponse.<OrderResponse>builder()
                .content(List.of(stubOrderResponse(1L, OrderStatus.CREATED)))
                .pageNumber(0).pageSize(10).totalElements(1).totalPages(1).isLast(true)
                .build();
        when(orderRepository.findByUserId(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(buildOrder(1L))));
        doReturn(mockPagedResponse).when(paginationMapper).toPagedResponse(any(), any());

        Instant start = Instant.now();

        // Submit writes
        IntStream.range(0, writeCount).forEach(i ->
                executor.submit(() -> {
                    try {
                        orderService.createOrder("writer-" + i, buildRequest("write-key-" + i));
                        writeSuccess.incrementAndGet();
                    } catch (Exception e) {
                        failures.incrementAndGet();
                    } finally {
                        latch.countDown();
                    }
                })
        );

        // Submit reads
        IntStream.range(0, readCount).forEach(i ->
                executor.submit(() -> {
                    try {
                        orderService.getOrdersForUser("reader-" + i, 0, 10);
                        readSuccess.incrementAndGet();
                    } catch (Exception e) {
                        failures.incrementAndGet();
                    } finally {
                        latch.countDown();
                    }
                })
        );

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        Duration totalDuration = Duration.between(start, Instant.now());

        System.out.println("=== LOAD TEST: Mixed Workload (Reads + Writes) ===");
        System.out.println("Write requests:  " + writeCount + " | Successful: " + writeSuccess.get());
        System.out.println("Read requests:   " + readCount + " | Successful: " + readSuccess.get());
        System.out.println("Failures:        " + failures.get());
        System.out.println("Total duration:  " + totalDuration.toMillis() + " ms");
        System.out.printf("Throughput:      %.1f req/sec%n",
                (double) totalCount / (totalDuration.toMillis() / 1000.0));

        assertThat(writeSuccess.get()).isEqualTo(writeCount);
        assertThat(readSuccess.get()).isEqualTo(readCount);
        assertThat(failures.get()).isZero();
    }

    // ===================== Stress: Rapid-Fire Single User =====================

    @Test
    @DisplayName("LOAD: 500 sequential orders from single user should all succeed")
    void shouldHandleRapidFireSingleUser() {
        when(orderRepository.findByUserIdAndIdempotencyKey(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(inventoryClient.reserveBulkStock(anyList()))
                .thenReturn(Collections.emptyList());
        when(orderMapper.toEntity(any(OrderRequest.class))).thenAnswer(invocation -> {
            long id = idGenerator.getAndIncrement();
            return buildOrder(id);
        });
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toResponse(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            return buildResponseFromOrder(o);
        });

        int orderCount = 500;
        List<OrderResponse> results = new ArrayList<>();

        Instant start = Instant.now();
        for (int i = 0; i < orderCount; i++) {
            OrderResponse result = orderService.createOrder("stress-user", buildRequest("stress-key-" + i));
            results.add(result);
        }
        Duration duration = Duration.between(start, Instant.now());

        System.out.println("=== LOAD TEST: Rapid-Fire Single User ===");
        System.out.println("Total orders:    " + orderCount);
        System.out.println("Total duration:  " + duration.toMillis() + " ms");
        System.out.printf("Throughput:      %.1f orders/sec%n",
                (double) orderCount / (duration.toMillis() / 1000.0));

        assertThat(results).hasSize(orderCount);
        assertThat(results).allMatch(r -> r.getStatus() == OrderStatus.VALIDATED);
    }
}
