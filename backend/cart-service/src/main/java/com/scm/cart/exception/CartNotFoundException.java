package com.scm.cart.exception;

import org.springframework.http.HttpStatus;

public class CartNotFoundException extends CartException {

    public CartNotFoundException(Long userId) {
        super("Cart not found for user ID: " + userId, HttpStatus.NOT_FOUND);
    }
}
