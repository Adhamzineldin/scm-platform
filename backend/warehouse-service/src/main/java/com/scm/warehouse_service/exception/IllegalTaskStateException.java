package com.scm.warehouse_service.exception;

public class IllegalTaskStateException extends RuntimeException {
    public IllegalTaskStateException(String message) {
        super(message);
    }
}
