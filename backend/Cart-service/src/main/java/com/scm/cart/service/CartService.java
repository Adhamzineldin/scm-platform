package com.scm.cart.service;

import com.scm.cart.entity.CartItem;
import java.util.List;

public interface CartService {

    void addItemToCart(Long userId, Long productId, int quantity);

    List<CartItem> getCartByUserId(Long userId);

    void updateItemQuantity(Long userId, Long productId, int quantity);

    void removeItemFromCart(Long userId, Long productId);

    void clearCartByUserId(Long userId);
}