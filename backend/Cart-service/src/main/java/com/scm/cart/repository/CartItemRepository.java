package com.scm.cart.repository;

import com.scm.cart.entity.Cart;
import com.scm.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    // get all items in a cart
    List<CartItem> findByCart(Cart cart);

    // find specific product in cart
    Optional<CartItem> findByCartAndProductId(Cart cart, Long productId);

    // delete all items in a cart
    void deleteByCart(Cart cart);
}