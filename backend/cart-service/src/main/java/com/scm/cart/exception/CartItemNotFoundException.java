package com.scm.cart.exception;

import org.springframework.http.HttpStatus;

public class CartItemNotFoundException extends CartException {

    public CartItemNotFoundException(Long userId, Long productId) {
        super("Product " + productId + " not found in cart for user ID: " + userId, HttpStatus.NOT_FOUND);
    }
}
