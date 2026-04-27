package com.scm.order_service.mappers;

import com.scm.order_service.dto.orders.*;
import com.scm.order_service.entity.Order;
import com.scm.order_service.entity.OrderItem;
import com.scm.order_service.enums.OrderStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class OrderMapperTest {

    private OrderMapper orderMapper;

    @BeforeEach
    void setUp() {
        orderMapper = new OrderMapper();
    }

    // ===================== toEntity Tests =====================

    @Nested
    @DisplayName("toEntity")
    class ToEntity {

        @Test
        @DisplayName("should map OrderRequest to Order entity with CREATED status")
        void shouldMapRequestToEntity() {
            OrderItemRequest itemRequest = new OrderItemRequest();
            itemRequest.setSku("SKU-001");
            itemRequest.setQuantity(3);

            OrderRequest request = new OrderRequest();
            request.setShippingAddress("456 Oak Ave");
            request.setIdempotencyKey("key-abc");
            request.setItems(List.of(itemRequest));

            Order entity = orderMapper.toEntity(request);

            assertThat(entity.getStatus()).isEqualTo(OrderStatus.CREATED);
            assertThat(entity.getShippingAddress()).isEqualTo("456 Oak Ave");
            assertThat(entity.getIdempotencyKey()).isEqualTo("key-abc");
            assertThat(entity.getItems()).hasSize(1);
            assertThat(entity.getItems().get(0).getSku()).isEqualTo("SKU-001");
            assertThat(entity.getItems().get(0).getQuantity()).isEqualTo(3);
            assertThat(entity.getItems().get(0).getOrder()).isEqualTo(entity);
        }

        @Test
        @DisplayName("should handle null items list gracefully")
        void shouldHandleNullItems() {
            OrderRequest request = new OrderRequest();
            request.setShippingAddress("456 Oak Ave");
            request.setIdempotencyKey("key-abc");
            request.setItems(null);

            Order entity = orderMapper.toEntity(request);

            assertThat(entity.getItems()).isEmpty();
        }

        @Test
        @DisplayName("should map multiple items correctly")
        void shouldMapMultipleItems() {
            OrderItemRequest item1 = new OrderItemRequest();
            item1.setSku("SKU-A");
            item1.setQuantity(1);
            OrderItemRequest item2 = new OrderItemRequest();
            item2.setSku("SKU-B");
            item2.setQuantity(10);

            OrderRequest request = new OrderRequest();
            request.setShippingAddress("789 Pine Rd");
            request.setIdempotencyKey("key-xyz");
            request.setItems(List.of(item1, item2));

            Order entity = orderMapper.toEntity(request);

            assertThat(entity.getItems()).hasSize(2);
            assertThat(entity.getItems()).extracting("sku")
                    .containsExactly("SKU-A", "SKU-B");
        }

        @Test
        @DisplayName("should set bidirectional relationship on items")
        void shouldSetBidirectionalRelationship() {
            OrderItemRequest itemRequest = new OrderItemRequest();
            itemRequest.setSku("SKU-001");
            itemRequest.setQuantity(1);

            OrderRequest request = new OrderRequest();
            request.setShippingAddress("Test St");
            request.setIdempotencyKey("key-1");
            request.setItems(List.of(itemRequest));

            Order entity = orderMapper.toEntity(request);

            for (OrderItem item : entity.getItems()) {
                assertThat(item.getOrder()).isSameAs(entity);
            }
        }
    }

    // ===================== toResponse Tests =====================

    @Nested
    @DisplayName("toResponse")
    class ToResponse {

        @Test
        @DisplayName("should map Order entity to OrderResponse")
        void shouldMapEntityToResponse() {
            OrderItem item = new OrderItem();
            item.setId(UUID.randomUUID());
            item.setSku("SKU-001");
            item.setQuantity(5);

            Order order = new Order();
            order.setId(1L);
            order.setUserId("user-42");
            order.setStatus(OrderStatus.PICKED);
            order.setShippingAddress("321 Elm St");
            order.setIdempotencyKey("key-999");
            order.setCreatedAt(LocalDateTime.of(2026, 1, 15, 10, 30));
            order.setUpdatedAt(LocalDateTime.of(2026, 1, 15, 11, 0));
            order.addItem(item);

            OrderResponse response = orderMapper.toResponse(order);

            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getUserId()).isEqualTo("user-42");
            assertThat(response.getStatus()).isEqualTo(OrderStatus.PICKED);
            assertThat(response.getShippingAddress()).isEqualTo("321 Elm St");
            assertThat(response.getIdempotencyKey()).isEqualTo("key-999");
            assertThat(response.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 1, 15, 10, 30));
            assertThat(response.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 1, 15, 11, 0));
            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getItems().get(0).getSku()).isEqualTo("SKU-001");
            assertThat(response.getItems().get(0).getQuantity()).isEqualTo(5);
        }

        @Test
        @DisplayName("should return empty items list when order has no items")
        void shouldHandleEmptyItems() {
            Order order = new Order();
            order.setId(2L);
            order.setUserId("user-1");
            order.setStatus(OrderStatus.CREATED);
            order.setShippingAddress("Test");
            order.setIdempotencyKey("key-1");

            OrderResponse response = orderMapper.toResponse(order);

            assertThat(response.getItems()).isEmpty();
        }

        @Test
        @DisplayName("should return empty items list when items is null")
        void shouldHandleNullItemsList() {
            Order order = new Order();
            order.setId(3L);
            order.setUserId("user-1");
            order.setStatus(OrderStatus.CREATED);
            order.setShippingAddress("Test");
            order.setIdempotencyKey("key-1");
            // items defaults to empty ArrayList in Order entity

            OrderResponse response = orderMapper.toResponse(order);

            assertThat(response.getItems()).isNotNull();
        }
    }
}
