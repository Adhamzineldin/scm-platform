package com.scm.order_service.exception;

public class WarehouseIntegrationException extends RuntimeException {
    public WarehouseIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
