package com.scm.cart.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity
public class CartItem {
    @Id
    @GeneratedValue
    private Long id;

    private Long cartId;

    private Long productId;
    private int quantity;
}



