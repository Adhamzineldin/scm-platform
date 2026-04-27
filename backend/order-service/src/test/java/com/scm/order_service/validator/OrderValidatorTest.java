package com.scm.order_service.validator;

import com.scm.order_service.dto.orders.OrderItemRequest;
import com.scm.order_service.dto.orders.OrderRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class OrderValidatorTest {

    private OrderValidator orderValidator;

    @BeforeEach
    void setUp() {
        orderValidator = new OrderValidator();
    }

    private OrderRequest buildValidRequest() {
        OrderItemRequest item = new OrderItemRequest();
        item.setSku("SKU-001");
        item.setQuantity(1);

        OrderRequest request = new OrderRequest();
        request.setIdempotencyKey("key-123");
        request.setShippingAddress("123 Main St");
        request.setItems(List.of(item));
        return request;
    }

    @Test
    @DisplayName("should pass validation for a valid order request")
    void shouldPassForValidRequest() {
        assertThatCode(() -> orderValidator.validateOrder(buildValidRequest()))
                .doesNotThrowAnyException();
    }

    // ===================== Shipping Address Validation =====================

    @Nested
    @DisplayName("Shipping Address Validation")
    class ShippingAddressValidation {

        @Test
        @DisplayName("should throw when shipping address is null")
        void shouldThrowWhenNull() {
            OrderRequest request = buildValidRequest();
            request.setShippingAddress(null);

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Shipping address is required");
        }

        @Test
        @DisplayName("should throw when shipping address is empty string")
        void shouldThrowWhenEmpty() {
            OrderRequest request = buildValidRequest();
            request.setShippingAddress("");

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Shipping address is required");
        }

        @Test
        @DisplayName("should throw when shipping address is blank (whitespace only)")
        void shouldThrowWhenBlank() {
            OrderRequest request = buildValidRequest();
            request.setShippingAddress("   ");

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Shipping address is required");
        }
    }

    // ===================== Idempotency Key Validation =====================

    @Nested
    @DisplayName("Idempotency Key Validation")
    class IdempotencyKeyValidation {

        @Test
        @DisplayName("should throw when idempotency key is null")
        void shouldThrowWhenNull() {
            OrderRequest request = buildValidRequest();
            request.setIdempotencyKey(null);

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Idempotency key is required");
        }

        @Test
        @DisplayName("should throw when idempotency key is empty string")
        void shouldThrowWhenEmpty() {
            OrderRequest request = buildValidRequest();
            request.setIdempotencyKey("");

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Idempotency key is required");
        }

        @Test
        @DisplayName("should throw when idempotency key is blank (whitespace only)")
        void shouldThrowWhenBlank() {
            OrderRequest request = buildValidRequest();
            request.setIdempotencyKey("   ");

            assertThatThrownBy(() -> orderValidator.validateOrder(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Idempotency key is required");
        }
    }
}
