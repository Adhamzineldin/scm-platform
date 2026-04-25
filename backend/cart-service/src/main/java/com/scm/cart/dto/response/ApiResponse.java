package com.scm.cart.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private String message;
    private T data;
    private int status;

    public static <T> ApiResponse<T> success(String message, T data, int status) {
        return ApiResponse.<T>builder()
                .message(message)
                .data(data)
                .status(status)
                .build();
    }

    public static ApiResponse<Void> success(String message, int status) {
        return ApiResponse.<Void>builder()
                .message(message)
                .status(status)
                .build();
    }

    public static ApiResponse<Void> error(String message, int status) {
        return ApiResponse.<Void>builder()
                .message(message)
                .status(status)
                .build();
    }

    public static <T> ApiResponse<T> error(String message, int status, T data) {
        return ApiResponse.<T>builder()
                .message(message)
                .data(data)
                .status(status)
                .build();
    }
}
