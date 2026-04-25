package com.scm.inventory_service.mapper;

import com.scm.inventory_service.dto.ProductRequest;
import com.scm.inventory_service.dto.ProductResponse;
import com.scm.inventory_service.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public Product toEntity(ProductRequest request) {
        Product product = new Product();
        applyUpdates(product, request);
        return product;
    }

    public void applyUpdates(Product product, ProductRequest request) {
        product.setSku(request.getSku().trim());
        product.setName(request.getName().trim());
        product.setDescription(request.getDescription());
        product.setQuantity(request.getQuantity());
        product.setUnitPrice(request.getUnitPrice());
        product.setReorderLevel(request.getReorderLevel());
    }

    public ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .description(product.getDescription())
                .quantity(product.getQuantity())
                .unitPrice(product.getUnitPrice())
                .reorderLevel(product.getReorderLevel())
                .lowStock(product.getQuantity() <= product.getReorderLevel())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
