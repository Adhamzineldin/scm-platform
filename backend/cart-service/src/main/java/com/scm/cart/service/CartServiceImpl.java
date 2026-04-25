package com.scm.cart.service;

import com.scm.cart.dto.response.CartResponse;
import com.scm.cart.entity.Cart;
import com.scm.cart.entity.CartItem;
import com.scm.cart.exception.CartItemNotFoundException;
import com.scm.cart.exception.CartNotFoundException;
import com.scm.cart.repository.CartItemRepository;
import com.scm.cart.repository.CartRepository;
import com.scm.cart.util.CartMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    @Override
    @Transactional
    public void addItemToCart(Long userId, Long productId, int quantity) {
        log.info("Adding product {} (qty: {}) to cart for user {}", productId, quantity, userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creating new cart for user {}", userId);
                    return cartRepository.save(Cart.builder().userId(userId).build());
                });

        cartItemRepository.findByCartAndProductId(cart, productId)
                .ifPresentOrElse(
                        existing -> {
                            existing.setQuantity(existing.getQuantity() + quantity);
                            cartItemRepository.save(existing);
                        },
                        () -> cartItemRepository.save(
                                CartItem.builder().cart(cart).productId(productId).quantity(quantity).build()
                        )
                );
    }

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCartByUserId(Long userId) {
        log.info("Fetching cart for user {}", userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException(userId));

        List<CartItem> items = cartItemRepository.findByCart(cart);
        return CartMapper.toCartResponse(cart, items);
    }

    @Override
    @Transactional
    public void updateItemQuantity(Long userId, Long productId, int quantity) {
        log.info("Updating product {} to qty {} for user {}", productId, quantity, userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException(userId));

        CartItem item = cartItemRepository.findByCartAndProductId(cart, productId)
                .orElseThrow(() -> new CartItemNotFoundException(userId, productId));

        item.setQuantity(quantity);
        cartItemRepository.save(item);
    }

    @Override
    @Transactional
    public void removeItemFromCart(Long userId, Long productId) {
        log.info("Removing product {} from cart for user {}", productId, userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException(userId));

        CartItem item = cartItemRepository.findByCartAndProductId(cart, productId)
                .orElseThrow(() -> new CartItemNotFoundException(userId, productId));

        cartItemRepository.delete(item);
    }

    @Override
    @Transactional
    public void clearCartByUserId(Long userId) {
        log.info("Clearing cart for user {}", userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException(userId));

        cartItemRepository.deleteByCart(cart);
    }
}
