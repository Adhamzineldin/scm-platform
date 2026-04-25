package com.scm.inventory_service.integration;

import com.scm.inventory_service.dto.StockReservationRequest;
import com.scm.inventory_service.entity.Product;
import com.scm.inventory_service.repository.ProductRepository;
import com.scm.inventory_service.service.InventoryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class InventoryConcurrencyIntegrationTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductRepository productRepository;

    @AfterEach
    void cleanUp() {
        productRepository.deleteAll();
    }

    @Test
    @DisplayName("should allow only one concurrent reservation to succeed for the same SKU")
    void shouldProtectConcurrentReservationsWithDatabaseLocking() throws Exception {
        Product product = new Product();
        product.setSku("SKU-CONC-001");
        product.setName("Concurrent Product");
        product.setDescription("Used to verify row-level locking");
        product.setQuantity(5);
        product.setUnitPrice(new BigDecimal("10.00"));
        product.setReorderLevel(1);
        productRepository.saveAndFlush(product);

        ExecutorService executorService = Executors.newFixedThreadPool(2);
        CountDownLatch startGate = new CountDownLatch(1);

        try {
            Future<List<String>> firstAttempt = executorService.submit(() -> reserveAfterGate(startGate));
            Future<List<String>> secondAttempt = executorService.submit(() -> reserveAfterGate(startGate));

            startGate.countDown();

            List<String> firstResult = firstAttempt.get(10, TimeUnit.SECONDS);
            List<String> secondResult = secondAttempt.get(10, TimeUnit.SECONDS);

            int successCount = 0;
            if (firstResult.isEmpty()) {
                successCount++;
            }
            if (secondResult.isEmpty()) {
                successCount++;
            }

            assertThat(successCount).isEqualTo(1);
            assertThat(List.of(firstResult, secondResult))
                    .anySatisfy(result -> assertThat(result).containsExactly("SKU-CONC-001"));

            Product updatedProduct = productRepository.findBySkuIgnoreCase("SKU-CONC-001").orElseThrow();
            assertThat(updatedProduct.getQuantity()).isEqualTo(1);
        }
        finally {
            executorService.shutdownNow();
        }
    }

    private List<String> reserveAfterGate(CountDownLatch startGate) throws Exception {
        startGate.await(5, TimeUnit.SECONDS);
        return inventoryService.reserveBulkStock(List.of(buildReservationRequest()));
    }

    private StockReservationRequest buildReservationRequest() {
        StockReservationRequest request = new StockReservationRequest();
        request.setSku("SKU-CONC-001");
        request.setQuantity(4);
        request.setUnitPrice(new BigDecimal("10.00"));
        return request;
    }
}
