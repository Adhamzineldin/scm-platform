package com.scm.order_service.exception;

import com.scm.order_service.dto.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        lenient().when(request.getRequestURI()).thenReturn("/api/orders");
    }

    @Test
    @DisplayName("should handle InsufficientStockException with 409 status")
    void shouldHandleInsufficientStock() {
        InsufficientStockException ex = new InsufficientStockException("Stock unavailable for: SKU-001");

        ErrorResponse response = handler.handleInsufficientStock(ex, request);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(response.getError()).isEqualTo("Conflict");
        assertThat(response.getMessage()).contains("SKU-001");
        assertThat(response.getPath()).isEqualTo("/api/orders");
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("should handle IllegalArgumentException with 400 status")
    void shouldHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input");

        ErrorResponse response = handler.handleIllegalArgument(ex, request);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(response.getError()).isEqualTo("Bad Request");
        assertThat(response.getMessage()).isEqualTo("Invalid input");
    }

    @Test
    @DisplayName("should handle MissingRequestHeaderException with 400 status")
    void shouldHandleMissingHeader() throws NoSuchMethodException {
        MethodParameter param = new MethodParameter(
                GlobalExceptionHandlerTest.class.getDeclaredMethod("setUp"), -1);
        MissingRequestHeaderException ex = new MissingRequestHeaderException("X-User-Id", param);

        ErrorResponse response = handler.handleMissingHeader(ex, request);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(response.getMessage()).contains("X-User-Id");
    }

    @Test
    @DisplayName("should handle MethodArgumentNotValidException with field-level errors")
    void shouldHandleValidationErrors() {
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError1 = new FieldError("orderRequest", "shippingAddress", "Shipping address is required");
        FieldError fieldError2 = new FieldError("orderRequest", "items", "Order must contain at least one item");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError1, fieldError2));

        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        Map<String, String> errors = handler.handleValidationExceptions(ex);

        assertThat(errors)
                .containsEntry("shippingAddress", "Shipping address is required")
                .containsEntry("items", "Order must contain at least one item");
    }

    @Test
    @DisplayName("should handle FeignException with 503 status")
    void shouldHandleFeignException() {
        feign.FeignException ex = mock(feign.FeignException.class);
        when(ex.getMessage()).thenReturn("Connection refused");

        ErrorResponse response = handler.handleFeignException(ex, request);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(response.getMessage()).contains("Inventory Service");
    }

    @Test
    @DisplayName("should handle generic Exception with 500 status")
    void shouldHandleGenericException() {
        Exception ex = new RuntimeException("Unexpected error");

        ErrorResponse response = handler.handleGenericException(ex, request);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(response.getMessage()).isEqualTo("An unexpected internal error occurred.");
    }
}
