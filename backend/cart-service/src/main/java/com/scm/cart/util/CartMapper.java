package com.scm.cart.util;

import com.scm.cart.dto.response.CartItemResponse;
import com.scm.cart.dto.response.CartResponse;
import com.scm.cart.entity.Cart;
import com.scm.cart.entity.CartItem;

import java.util.List;

public final class CartMapper {

    private CartMapper() {}

    public static CartItemResponse toCartItemResponse(CartItem item) {
        return CartItemResponse.builder()
                .productId(item.getProductId())
                .quantity(item.getQuantity())
                .build();
    }

    public static CartResponse toCartResponse(Cart cart, List<CartItem> items) {
        List<CartItemResponse> itemResponses = items.stream()
                .map(CartMapper::toCartItemResponse)
                .toList();

        return CartResponse.builder()
                .userId(cart.getUserId())
                .items(itemResponses)
                .totalItems(itemResponses.size())
                .build();
    }
}
