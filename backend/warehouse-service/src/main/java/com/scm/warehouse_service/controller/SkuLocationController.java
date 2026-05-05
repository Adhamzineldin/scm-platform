package com.scm.warehouse_service.controller;

import com.scm.warehouse_service.dto.SkuLocationRequest;
import com.scm.warehouse_service.dto.SkuLocationResponse;
import com.scm.warehouse_service.service.SkuLocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/warehouse/locations")
@RequiredArgsConstructor
public class SkuLocationController {

    private final SkuLocationService skuLocationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SkuLocationResponse assignLocation(@Valid @RequestBody SkuLocationRequest request) {
        return skuLocationService.assignLocation(request);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public Page<SkuLocationResponse> getAllLocations(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return skuLocationService.getAllLocations(page, size);
    }

    @GetMapping("/{sku}")
    @ResponseStatus(HttpStatus.OK)
    public SkuLocationResponse getLocation(@PathVariable String sku) {
        return skuLocationService.getLocation(sku);
    }
}
