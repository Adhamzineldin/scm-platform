package com.scm.inventory_service.service;

import com.scm.inventory_service.dto.ProductRequest;
import com.scm.inventory_service.dto.ProductResponse;
import com.scm.inventory_service.dto.StockReservationRequest;
import com.scm.inventory_service.exception.DuplicateSkuException;
import com.scm.inventory_service.exception.ProductNotFoundException;
import com.scm.inventory_service.mapper.ProductMapper;
import com.scm.inventory_service.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;

    private ProductMapper productMapper;

    @InjectMocks
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        productMapper = new ProductMapper();
        inventoryService = new InventoryService(productRepository, productMapper);
    }

    @Test
    @DisplayName("should create product when sku is unique")
    void shouldCreateProduct() {
        ProductRequest request = buildProductRequest();
        when(productRepository.existsBySkuIgnoreCase("SKU-001")).thenReturn(false);
        when(productRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            var product = invocation.getArgument(0, com.scm.inventory_service.entity.Product.class);
            product.setId(1L);
            return product;
        });

        ProductResponse response = inventoryService.createProduct(request);

        assertThat(response.getSku()).isEqualTo("SKU-001");
        assertThat(response.getName()).isEqualTo("Laptop");
        verify(productRepository).saveAndFlush(any());
    }

    @Test
    @DisplayName("should reject duplicate sku")
    void shouldRejectDuplicateSku() {
        ProductRequest request = buildProductRequest();
        when(productRepository.existsBySkuIgnoreCase("SKU-001")).thenReturn(true);

        assertThatThrownBy(() -> inventoryService.createProduct(request))
                .isInstanceOf(DuplicateSkuException.class);
    }

    @Test
    @DisplayName("should return failed sku when stock is insufficient")
    void shouldReturnFailedSkuWhenInsufficient() {
        when(productRepository.findBySkuIgnoreCaseForUpdate("SKU-001"))
                .thenReturn(Optional.of(buildProduct(3)));

        List<String> failed = inventoryService.reserveBulkStock(List.of(buildReservationRequest(5)));

        assertThat(failed).containsExactly("SKU-001");
    }

    @Test
    @DisplayName("should deduct stock when reservation succeeds")
    void shouldReserveStock() {
        var product = buildProduct(10);
        when(productRepository.findBySkuIgnoreCaseForUpdate("SKU-001"))
                .thenReturn(Optional.of(product));

        List<String> failed = inventoryService.reserveBulkStock(List.of(buildReservationRequest(4)));

        assertThat(failed).isEmpty();
        assertThat(product.getQuantity()).isEqualTo(6);
        verify(productRepository).saveAll(any());
    }

    @Test
    @DisplayName("should aggregate duplicate sku quantities during bulk reserve")
    void shouldAggregateDuplicateSkuQuantitiesDuringBulkReserve() {
        var product = buildProduct(10);
        when(productRepository.findBySkuIgnoreCaseForUpdate("SKU-001"))
                .thenReturn(Optional.of(product));

        List<String> failed = inventoryService.reserveBulkStock(List.of(
                buildReservationRequest(6),
                buildReservationRequest(5)
        ));

        assertThat(failed).containsExactly("SKU-001");
    }

    @Test
    @DisplayName("should aggregate duplicate sku quantities during bulk check")
    void shouldAggregateDuplicateSkuQuantitiesDuringBulkCheck() {
        when(productRepository.findBySkuIgnoreCase("SKU-001"))
                .thenReturn(Optional.of(buildProduct(10)));

        List<String> failed = inventoryService.checkBulkStock(List.of(
                buildReservationRequest(6),
                buildReservationRequest(5)
        ));

        assertThat(failed).containsExactly("SKU-001");
    }

    @Test
    @DisplayName("should throw when product sku does not exist")
    void shouldThrowWhenProductMissing() {
        when(productRepository.findBySkuIgnoreCase("MISSING-SKU"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.getProductBySku("missing-sku"))
                .isInstanceOf(ProductNotFoundException.class);
    }

    private ProductRequest buildProductRequest() {
        ProductRequest request = new ProductRequest();
        request.setSku("sku-001");
        request.setName("Laptop");
        request.setDescription("Warehouse laptop");
        request.setQuantity(10);
        request.setUnitPrice(new BigDecimal("999.99"));
        request.setReorderLevel(2);
        return request;
    }

    private StockReservationRequest buildReservationRequest(int quantity) {
        StockReservationRequest request = new StockReservationRequest();
        request.setSku("sku-001");
        request.setQuantity(quantity);
        request.setUnitPrice(new BigDecimal("999.99"));
        return request;
    }

    private com.scm.inventory_service.entity.Product buildProduct(int quantity) {
        var product = new com.scm.inventory_service.entity.Product();
        product.setId(1L);
        product.setSku("SKU-001");
        product.setName("Laptop");
        product.setDescription("Warehouse laptop");
        product.setQuantity(quantity);
        product.setUnitPrice(new BigDecimal("999.99"));
        product.setReorderLevel(2);
        return product;
    }
}
