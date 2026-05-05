package com.scm.warehouse_service.controller;

import com.scm.warehouse_service.dto.WarehouseZoneRequest;
import com.scm.warehouse_service.dto.WarehouseZoneResponse;
import com.scm.warehouse_service.service.WarehouseZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/warehouse/zones")
@RequiredArgsConstructor
public class WarehouseZoneController {

    private final WarehouseZoneService warehouseZoneService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WarehouseZoneResponse createZone(@Valid @RequestBody WarehouseZoneRequest request) {
        return warehouseZoneService.createZone(request);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public Page<WarehouseZoneResponse> getAllZones(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return warehouseZoneService.getAllZones(page, size);
    }
}
