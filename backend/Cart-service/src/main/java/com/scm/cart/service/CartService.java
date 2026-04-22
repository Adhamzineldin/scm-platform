package com.scm.cart.service;

import com.scm.cart.dto.response.CartResponse;

public interface CartService {

    void addItemToCart(Long userId, Long productId, int quantity);

    CartResponse getCartByUserId(Long userId);

    void updateItemQuantity(Long userId, Long productId, int quantity);

    void removeItemFromCart(Long userId, Long productId);

    void clearCartByUserId(Long userId);
}
