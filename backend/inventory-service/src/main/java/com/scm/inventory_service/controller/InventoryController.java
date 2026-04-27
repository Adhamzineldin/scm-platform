package com.scm.inventory_service.controller;

import com.scm.inventory_service.dto.StockCheckResponse;
import com.scm.inventory_service.dto.StockReservationRequest;
import com.scm.inventory_service.service.InventoryService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Validated
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/check")
    @ResponseStatus(HttpStatus.OK)
    public boolean checkStock(@RequestParam @NotBlank(message = "SKU is required") String sku,
                              @RequestParam @Min(value = 1, message = "Quantity must be at least 1") Integer quantity) {
        return inventoryService.checkStock(sku, quantity);
    }

    @GetMapping("/status")
    @ResponseStatus(HttpStatus.OK)
    public StockCheckResponse getStockStatus(@RequestParam @NotBlank(message = "SKU is required") String sku,
                                             @RequestParam @Min(value = 1, message = "Quantity must be at least 1") Integer quantity) {
        return inventoryService.getStockStatus(sku, quantity);
    }

    @PostMapping("/bulk-check")
    @ResponseStatus(HttpStatus.OK)
    public List<String> checkBulkStock(@RequestBody List<@Valid StockReservationRequest> items) {
        return inventoryService.checkBulkStock(items);
    }

    @PostMapping("/bulk-reserve")
    @ResponseStatus(HttpStatus.OK)
    public List<String> reserveBulkStock(@RequestBody List<@Valid StockReservationRequest> items) {
        return inventoryService.reserveBulkStock(items);
    }
}
