package com.scm.warehouse_service.exception;

public class OrderServiceCallbackException extends RuntimeException {
    public OrderServiceCallbackException(String message, Throwable cause) {
        super(message, cause);
    }
}
