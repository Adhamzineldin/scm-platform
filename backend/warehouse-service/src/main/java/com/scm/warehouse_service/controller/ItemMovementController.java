package com.scm.warehouse_service.controller;

import com.scm.warehouse_service.dto.ItemMovementResponse;
import com.scm.warehouse_service.service.ItemMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse/movements")
@RequiredArgsConstructor
public class ItemMovementController {

    private final ItemMovementService itemMovementService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ItemMovementResponse> getAllMovements() {
        return itemMovementService.getAllMovements();
    }

    @GetMapping("/sku/{sku}")
    @ResponseStatus(HttpStatus.OK)
    public List<ItemMovementResponse> getMovementsForSku(@PathVariable String sku) {
        return itemMovementService.getMovementsForSku(sku);
    }
}
