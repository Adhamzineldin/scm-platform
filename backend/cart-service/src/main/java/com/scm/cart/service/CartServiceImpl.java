package com.scm.cart.service;

import com.scm.cart.client.OrderClient;
import com.scm.cart.client.ProductClient;
import com.scm.cart.dto.external.OrderRequest;
import com.scm.cart.dto.external.OrderRequest.OrderItemRequest;
import com.scm.cart.dto.external.OrderResponse;
import com.scm.cart.dto.external.ProductResponse;
import com.scm.cart.dto.request.CheckoutRequest;
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
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductClient productClient;
    private final OrderClient orderClient;

    @Override
    @Transactional
    public void addItemToCart(Long userId, Long productId, int quantity) {
        log.info("Adding product {} (qty: {}) to cart for user {}", productId, quantity, userId);

        // Sync validation: confirm product exists in inventory before mutating cart
        ProductResponse product = productClient.getProductById(productId);
        if (product == null) {
            throw new IllegalArgumentException("Product " + productId + " not found in inventory");
        }

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

    @Override
    @Transactional
    public OrderResponse checkout(Long userId, CheckoutRequest request) {
        log.info("Checking out cart for user {}", userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException(userId));

        List<CartItem> items = cartItemRepository.findByCart(cart);
        if (items.isEmpty()) {
            throw new IllegalStateException("Cannot checkout an empty cart for user " + userId);
        }

        // Enrich each cart item with sku + unitPrice from inventory-service.
        List<OrderItemRequest> orderItems = items.stream()
                .map(item -> {
                    ProductResponse product = productClient.getProductById(item.getProductId());
                    if (product == null) {
                        throw new IllegalStateException(
                                "Product " + item.getProductId() + " no longer exists in inventory");
                    }
                    return OrderItemRequest.builder()
                            .sku(product.getSku())
                            .quantity(item.getQuantity())
                            .unitPrice(product.getUnitPrice())
                            .build();
                })
                .toList();

        String idempotencyKey = (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank())
                ? request.getIdempotencyKey()
                : UUID.randomUUID().toString();

        OrderRequest orderRequest = OrderRequest.builder()
                .idempotencyKey(idempotencyKey)
                .shippingAddress(request.getShippingAddress())
                .items(orderItems)
                .build();

        OrderResponse order = orderClient.createOrder(orderRequest, String.valueOf(userId));
        log.info("Order #{} created for user {} (idempotencyKey={})", order.getId(), userId, idempotencyKey);

        // Clear the cart only after the order has been accepted by order-service
        cartItemRepository.deleteByCart(cart);
        return order;
    }
}
