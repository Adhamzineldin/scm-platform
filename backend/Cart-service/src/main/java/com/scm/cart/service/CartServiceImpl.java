package com.scm.cart.service;

import com.scm.cart.entity.Cart;
import com.scm.cart.entity.CartItem;
import com.scm.cart.repository.CartItemRepository;
import com.scm.cart.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    @Override
    public void addToCart(Long userId, Long productId, int quantity) {

        // 1️⃣ Get or create cart
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    newCart.setUserId(userId);
                    return cartRepository.save(newCart);
                });

        // 2️⃣ Check if item already exists in cart
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());

        Optional<CartItem> existingItem = items.stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        // 3️⃣ If exists → update quantity
        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantity);
            cartItemRepository.save(item);
        }
        // 4️⃣ If not → create new item
        else {
            CartItem newItem = new CartItem();
            newItem.setCartId(cart.getId());
            newItem.setProductId(productId);
            newItem.setQuantity(quantity);

            cartItemRepository.save(newItem);
        }
    }
}