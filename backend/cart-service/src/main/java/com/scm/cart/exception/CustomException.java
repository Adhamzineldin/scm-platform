package com.scm.cart.exception;

import org.springframework.http.HttpStatus;

public class CustomException extends CartException {

    public CustomException(String message, HttpStatus status) {
        super(message, status);
    }
}
