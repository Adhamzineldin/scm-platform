package com.scm.cart.service;

import com.scm.cart.dto.external.OrderResponse;
import com.scm.cart.dto.request.CheckoutRequest;
import com.scm.cart.dto.response.CartResponse;

public interface CartService {

    void addItemToCart(Long userId, Long productId, int quantity);

    CartResponse getCartByUserId(Long userId);

    void updateItemQuantity(Long userId, Long productId, int quantity);

    void removeItemFromCart(Long userId, Long productId);

    void clearCartByUserId(Long userId);

    /**
     * Synchronously converts the user's cart into an order via order-service,
     * then clears the cart on success.
     */
    OrderResponse checkout(Long userId, CheckoutRequest request);
}
