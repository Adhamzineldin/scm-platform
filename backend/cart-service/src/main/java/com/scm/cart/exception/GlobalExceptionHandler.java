package com.scm.cart.exception;

import com.scm.cart.dto.response.ApiResponse;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CartException.class)
    public ResponseEntity<ApiResponse<Void>> handleCartException(CartException ex) {
        log.warn("Cart business exception: {}", ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage(), ex.getStatus().value()));
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ApiResponse<Void>> handleFeignException(FeignException ex) {
        int status = ex.status();
        String body = ex.responseBody()
                .map(buf -> StandardCharsets.UTF_8.decode(buf.asReadOnlyBuffer()).toString())
                .orElse(null);

        String message = extractMessage(body);
        if (message == null) {
            message = switch (status) {
                case 409 -> "Insufficient stock — one or more items are unavailable";
                case 404 -> "A required resource was not found";
                case 400 -> "Invalid order data";
                default -> "Downstream service error";
            };
        }

        log.warn("Feign call failed (HTTP {}): {}", status, message);
        HttpStatus httpStatus = status >= 400 && status < 600
                ? HttpStatus.resolve(status) != null ? HttpStatus.resolve(status) : HttpStatus.BAD_GATEWAY
                : HttpStatus.BAD_GATEWAY;
        return ResponseEntity
                .status(httpStatus)
                .body(ApiResponse.error(message, httpStatus.value()));
    }

    private String extractMessage(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            int idx = json.indexOf("\"message\"");
            if (idx < 0) return null;
            int colon = json.indexOf(':', idx);
            int start = json.indexOf('"', colon + 1) + 1;
            int end = json.indexOf('"', start);
            if (start > 0 && end > start) return json.substring(start, end);
        } catch (Exception ignored) {}
        return null;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        log.warn("Cart state error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error(ex.getMessage(), HttpStatus.UNPROCESSABLE_ENTITY.value()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Validation failed", HttpStatus.BAD_REQUEST.value(), errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }
}
