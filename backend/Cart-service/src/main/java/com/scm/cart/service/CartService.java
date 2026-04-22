package com.scm.cart.service;

public interface CartService {
    void addToCart(Long userId, Long productId, int quantity);
    void removeFromCart(Long userId, Long productId, int quantity);
}
