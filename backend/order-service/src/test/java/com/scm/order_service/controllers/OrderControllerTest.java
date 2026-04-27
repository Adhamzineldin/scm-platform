package com.scm.order_service.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.order_service.dto.orders.*;
import com.scm.order_service.enums.OrderStatus;
import com.scm.order_service.exception.GlobalExceptionHandler;
import com.scm.order_service.exception.InsufficientStockException;
import com.scm.order_service.services.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = OrderController.class)
@ActiveProfiles("mvc-test")
@Import(GlobalExceptionHandler.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @Autowired
    private ObjectMapper objectMapper;

    private OrderRequest validRequest;
    private OrderResponse orderResponse;

    @BeforeEach
    void setUp() {
        OrderItemRequest itemRequest = new OrderItemRequest();
        itemRequest.setSku("SKU-001");
        itemRequest.setQuantity(2);
        itemRequest.setUnitPrice(BigDecimal.valueOf(9.99));

        validRequest = new OrderRequest();
        validRequest.setIdempotencyKey("idem-key-123");
        validRequest.setShippingAddress("123 Main St");
        validRequest.setItems(List.of(itemRequest));

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

    // ===================== POST /api/orders =====================

    @Nested
    @DisplayName("POST /api/orders")
    class PlaceOrder {

        @Test
        @DisplayName("should create order and return 201")
        void shouldCreateOrder() throws Exception {
            when(orderService.createOrder(eq("user-1"), any(OrderRequest.class)))
                    .thenReturn(orderResponse);

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.userId").value("user-1"))
                    .andExpect(jsonPath("$.status").value("VALIDATED"))
                    .andExpect(jsonPath("$.shippingAddress").value("123 Main St"))
                    .andExpect(jsonPath("$.idempotencyKey").value("idem-key-123"))
                    .andExpect(jsonPath("$.items", hasSize(1)))
                    .andExpect(jsonPath("$.items[0].sku").value("SKU-001"))
                    .andExpect(jsonPath("$.items[0].quantity").value(2));
        }

        @Test
        @DisplayName("should return 400 when X-User-Id header is missing")
        void shouldReturn400WhenUserIdHeaderMissing() throws Exception {
            mockMvc.perform(post("/api/orders")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(containsString("X-User-Id")));
        }

        @Test
        @DisplayName("should return 400 when request body is missing")
        void shouldReturn400WhenBodyMissing() throws Exception {
            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when shippingAddress is blank")
        void shouldReturn400WhenShippingAddressBlank() throws Exception {
            validRequest.setShippingAddress("");

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.shippingAddress").exists());
        }

        @Test
        @DisplayName("should return 400 when idempotencyKey is blank")
        void shouldReturn400WhenIdempotencyKeyBlank() throws Exception {
            validRequest.setIdempotencyKey("");

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.idempotencyKey").exists());
        }

        @Test
        @DisplayName("should return 400 when items list is empty")
        void shouldReturn400WhenItemsEmpty() throws Exception {
            validRequest.setItems(Collections.emptyList());

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.items").exists());
        }

        @Test
        @DisplayName("should return 400 when items list is null")
        void shouldReturn400WhenItemsNull() throws Exception {
            validRequest.setItems(null);

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when item SKU is blank")
        void shouldReturn400WhenItemSkuBlank() throws Exception {
            OrderItemRequest badItem = new OrderItemRequest();
            badItem.setSku("");
            badItem.setQuantity(1);
            badItem.setUnitPrice(BigDecimal.ONE);
            validRequest.setItems(List.of(badItem));

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when item quantity is zero")
        void shouldReturn400WhenItemQuantityZero() throws Exception {
            OrderItemRequest badItem = new OrderItemRequest();
            badItem.setSku("SKU-001");
            badItem.setQuantity(0);
            badItem.setUnitPrice(BigDecimal.ONE);
            validRequest.setItems(List.of(badItem));

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when item quantity is negative")
        void shouldReturn400WhenItemQuantityNegative() throws Exception {
            OrderItemRequest badItem = new OrderItemRequest();
            badItem.setSku("SKU-001");
            badItem.setQuantity(-5);
            badItem.setUnitPrice(BigDecimal.ONE);
            validRequest.setItems(List.of(badItem));

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 409 when inventory is insufficient")
        void shouldReturn409WhenInsufficientStock() throws Exception {
            when(orderService.createOrder(eq("user-1"), any(OrderRequest.class)))
                    .thenThrow(new InsufficientStockException("Stock unavailable for: SKU-001"));

            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value(containsString("SKU-001")));
        }

        @Test
        @DisplayName("should return 400 when malformed JSON is sent")
        void shouldReturn400WhenMalformedJson() throws Exception {
            mockMvc.perform(post("/api/orders")
                            .header("X-User-Id", "user-1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{invalid-json}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(containsString("missing or malformed")));
        }
    }

    // ===================== GET /api/orders/my-orders =====================

    @Nested
    @DisplayName("GET /api/orders/my-orders")
    class GetMyOrders {

        @Test
        @DisplayName("should return paginated user orders with 200")
        void shouldReturnUserOrders() throws Exception {
            PagedResponse<OrderResponse> pagedResponse = PagedResponse.<OrderResponse>builder()
                    .content(List.of(orderResponse))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1)
                    .totalPages(1)
                    .isLast(true)
                    .build();

            when(orderService.getOrdersForUser("user-1", 0, 10)).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/orders/my-orders")
                            .header("X-User-Id", "user-1")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.pageNumber").value(0))
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.totalPages").value(1));
        }

        @Test
        @DisplayName("should return 400 when X-User-Id header is missing")
        void shouldReturn400WhenUserIdMissing() throws Exception {
            mockMvc.perform(get("/api/orders/my-orders"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(containsString("X-User-Id")));
        }

        @Test
        @DisplayName("should use default page and size when not provided")
        void shouldUseDefaultPagination() throws Exception {
            PagedResponse<OrderResponse> pagedResponse = PagedResponse.<OrderResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0)
                    .totalPages(0)
                    .isLast(true)
                    .build();

            when(orderService.getOrdersForUser("user-1", 0, 10)).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/orders/my-orders")
                            .header("X-User-Id", "user-1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.pageNumber").value(0))
                    .andExpect(jsonPath("$.pageSize").value(10));
        }
    }
}
