package com.scm.inventory_service.service;

import com.scm.inventory_service.dto.ProductRequest;
import com.scm.inventory_service.dto.ProductResponse;
import com.scm.inventory_service.dto.StockCheckResponse;
import com.scm.inventory_service.dto.StockReservationRequest;
import com.scm.inventory_service.entity.Product;
import com.scm.inventory_service.exception.DuplicateSkuException;
import com.scm.inventory_service.exception.ProductNotFoundException;
import com.scm.inventory_service.mapper.ProductMapper;
import com.scm.inventory_service.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        String normalizedSku = (request.getSku() == null || request.getSku().isBlank())
                ? generateSku()
                : normalizeSku(request.getSku());

        if (productRepository.existsBySkuIgnoreCase(normalizedSku)) {
            throw new DuplicateSkuException(normalizedSku);
        }

        Product product = productMapper.toEntity(request);
        product.setSku(normalizedSku);
        return productMapper.toResponse(saveProductHandlingDuplicateSku(product));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(productMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return productMapper.toResponse(findProductById(id));
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductBySku(String sku) {
        return productMapper.toResponse(findProductBySku(sku));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = findProductById(id);
        if (request.getSku() != null && !request.getSku().isBlank()) {
            String normalizedSku = normalizeSku(request.getSku());
            if (productRepository.existsBySkuIgnoreCaseAndIdNot(normalizedSku, id)) {
                throw new DuplicateSkuException(normalizedSku);
            }
            request.setSku(normalizedSku);
        }
        productMapper.applyUpdates(product, request);
        return productMapper.toResponse(saveProductHandlingDuplicateSku(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProductById(id);
        productRepository.delete(product);
    }

    @Transactional(readOnly = true)
    public boolean checkStock(String sku, Integer quantity) {
        validateRequestedQuantity(quantity);
        Product product = findProductBySku(sku);
        return product.getQuantity() >= quantity;
    }

    @Transactional(readOnly = true)
    public StockCheckResponse getStockStatus(String sku, Integer quantity) {
        validateRequestedQuantity(quantity);
        Product product = findProductBySku(sku);
        return StockCheckResponse.builder()
                .sku(product.getSku())
                .requestedQuantity(quantity)
                .availableQuantity(product.getQuantity())
                .inStock(product.getQuantity() >= quantity)
                .build();
    }

    @Transactional(readOnly = true)
    public List<String> checkBulkStock(List<StockReservationRequest> items) {
        validateItems(items);
        Map<String, Integer> requestedQuantities = aggregateRequestedQuantities(items);
        List<String> failedSkus = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : requestedQuantities.entrySet()) {
            if (!checkStock(entry.getKey(), entry.getValue())) {
                failedSkus.add(entry.getKey());
            }
        }
        return failedSkus;
    }

    @Transactional
    public List<String> reserveBulkStock(List<StockReservationRequest> items) {
        validateItems(items);
        Map<String, Integer> requestedQuantities = aggregateRequestedQuantities(items);

        List<String> failedSkus = new ArrayList<>();
        List<Product> productsToUpdate = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : requestedQuantities.entrySet()) {
            Product product = findProductBySkuForUpdate(entry.getKey());
            if (product.getQuantity() < entry.getValue()) {
                failedSkus.add(product.getSku());
                continue;
            }

            product.setQuantity(product.getQuantity() - entry.getValue());
            productsToUpdate.add(product);
        }

        if (!failedSkus.isEmpty()) {
            return failedSkus;
        }

        productRepository.saveAll(productsToUpdate);
        return List.of();
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with ID: " + id));
    }

    private Product findProductBySku(String sku) {
        String normalizedSku = normalizeSku(sku);
        return productRepository.findBySkuIgnoreCase(normalizedSku)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with SKU: " + normalizedSku));
    }

    private Product findProductBySkuForUpdate(String sku) {
        String normalizedSku = normalizeSku(sku);
        return productRepository.findBySkuIgnoreCaseForUpdate(normalizedSku)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with SKU: " + normalizedSku));
    }

    private void validateRequestedQuantity(Integer quantity) {
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }
    }

    private void validateItems(List<StockReservationRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }
    }

    private Map<String, Integer> aggregateRequestedQuantities(List<StockReservationRequest> items) {
        Map<String, Integer> requestedQuantities = new LinkedHashMap<>();

        for (StockReservationRequest item : items) {
            String normalizedSku = normalizeSku(item.getSku());
            validateRequestedQuantity(item.getQuantity());
            requestedQuantities.merge(normalizedSku, item.getQuantity(), Integer::sum);
        }

        return requestedQuantities;
    }

    private String normalizeSku(String sku) {
        if (sku == null || sku.isBlank()) {
            throw new IllegalArgumentException("SKU is required");
        }
        return sku.trim().toUpperCase();
    }

    private String generateSku() {
        return "SKU-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private Product saveProductHandlingDuplicateSku(Product product) {
        try {
            return productRepository.saveAndFlush(product);
        }
        catch (DataIntegrityViolationException ex) {
            throw new DuplicateSkuException(product.getSku());
        }
    }
}
