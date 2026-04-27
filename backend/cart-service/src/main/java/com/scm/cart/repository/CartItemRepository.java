package com.scm.cart.repository;

import com.scm.cart.entity.Cart;
import com.scm.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCart(Cart cart);

    Optional<CartItem> findByCartAndProductId(Cart cart, Long productId);

    @Transactional
    void deleteByCart(Cart cart);
}
