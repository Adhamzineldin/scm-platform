package com.scm.cart.dto.response;

import lombok.*;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponse {

    private Long userId;
    private List<CartItemResponse> items;
    private int totalItems;
}
