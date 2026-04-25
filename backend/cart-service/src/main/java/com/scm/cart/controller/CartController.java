package com.scm.cart.controller;

import com.scm.cart.dto.request.AddItemToCartRequest;
import com.scm.cart.dto.request.UpdateCartItemRequest;
import com.scm.cart.dto.response.ApiResponse;
import com.scm.cart.dto.response.CartResponse;
import com.scm.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/carts")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<Void>> addItem(@Valid @RequestBody AddItemToCartRequest request) {
        cartService.addItemToCart(request.getUserId(), request.getProductId(), request.getQuantity());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Item added successfully", HttpStatus.CREATED.value()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<CartResponse>> getCart(@PathVariable Long userId) {
        CartResponse cart = cartService.getCartByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Cart retrieved successfully", cart, HttpStatus.OK.value()));
    }

    @PutMapping("/items")
    public ResponseEntity<ApiResponse<Void>> updateItem(@Valid @RequestBody UpdateCartItemRequest request) {
        cartService.updateItemQuantity(request.getUserId(), request.getProductId(), request.getQuantity());
        return ResponseEntity.ok(ApiResponse.success("Item updated successfully", HttpStatus.OK.value()));
    }

    @DeleteMapping("/{userId}/items/{productId}")
    public ResponseEntity<ApiResponse<Void>> removeItem(@PathVariable Long userId,
                                                        @PathVariable Long productId) {
        cartService.removeItemFromCart(userId, productId);
        return ResponseEntity.ok(ApiResponse.success("Item removed successfully", HttpStatus.OK.value()));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> clearCart(@PathVariable Long userId) {
        cartService.clearCartByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Cart cleared successfully", HttpStatus.OK.value()));
    }
}
