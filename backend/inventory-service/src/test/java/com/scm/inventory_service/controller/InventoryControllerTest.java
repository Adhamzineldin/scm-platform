package com.scm.inventory_service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scm.inventory_service.dto.ProductResponse;
import com.scm.inventory_service.dto.StockReservationRequest;
import com.scm.inventory_service.exception.ProductNotFoundException;
import com.scm.inventory_service.service.InventoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ProductController.class, InventoryController.class})
@Import(com.scm.inventory_service.exception.GlobalExceptionHandler.class)
class InventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InventoryService inventoryService;

    @Test
    @DisplayName("should return product by id")
    void shouldReturnProductById() throws Exception {
        when(inventoryService.getProductById(1L)).thenReturn(ProductResponse.builder()
                .id(1L)
                .sku("SKU-001")
                .name("Laptop")
                .description("Warehouse laptop")
                .quantity(15)
                .unitPrice(new BigDecimal("999.99"))
                .reorderLevel(4)
                .lowStock(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("SKU-001"))
                .andExpect(jsonPath("$.quantity").value(15));
    }

    @Test
    @DisplayName("should return true when stock is available")
    void shouldReturnTrueWhenStockAvailable() throws Exception {
        when(inventoryService.checkStock("SKU-001", 3)).thenReturn(true);

        mockMvc.perform(get("/api/inventory/check")
                        .param("sku", "SKU-001")
                        .param("quantity", "3"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("should return failed skus for bulk reserve")
    void shouldReturnFailedSkusForBulkReserve() throws Exception {
        StockReservationRequest request = new StockReservationRequest();
        request.setSku("SKU-001");
        request.setQuantity(5);
        request.setUnitPrice(new BigDecimal("12.50"));

        when(inventoryService.reserveBulkStock(org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(List.of("SKU-001"));

        mockMvc.perform(post("/api/inventory/bulk-reserve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(request))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("SKU-001"));
    }

    @Test
    @DisplayName("should return 404 when product does not exist")
    void shouldReturn404WhenProductMissing() throws Exception {
        when(inventoryService.getProductById(99L))
                .thenThrow(new ProductNotFoundException("Product not found with ID: 99"));

        mockMvc.perform(get("/api/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found with ID: 99"));
    }

    @Test
    @DisplayName("should return 400 when bulk reserve request is invalid")
    void shouldReturn400WhenBulkReserveRequestInvalid() throws Exception {
        StockReservationRequest request = new StockReservationRequest();
        request.setSku("");
        request.setQuantity(0);
        request.setUnitPrice(new BigDecimal("0"));

        mockMvc.perform(post("/api/inventory/bulk-reserve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(request))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.sku").value("SKU is required"))
                .andExpect(jsonPath("$.quantity").value("Quantity must be at least 1"))
                .andExpect(jsonPath("$.unitPrice").value("Unit price must be greater than zero"));
    }
}
