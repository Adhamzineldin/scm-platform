package com.scm.warehouse_service.service;

import com.scm.warehouse_service.dto.SkuLocationRequest;
import com.scm.warehouse_service.dto.SkuLocationResponse;
import com.scm.warehouse_service.entity.SkuLocation;
import com.scm.warehouse_service.entity.WarehouseZone;
import com.scm.warehouse_service.exception.ConflictException;
import com.scm.warehouse_service.exception.ResourceNotFoundException;
import com.scm.warehouse_service.repository.SkuLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SkuLocationService {

    private final SkuLocationRepository skuLocationRepository;
    private final WarehouseZoneService warehouseZoneService;

    @Transactional
    public SkuLocationResponse assignLocation(SkuLocationRequest request) {
        String normalizedSku = normalizeSku(request.getSku());
        if (skuLocationRepository.existsBySkuIgnoreCase(normalizedSku)) {
            throw new ConflictException("Location already exists for SKU: " + normalizedSku);
        }

        WarehouseZone zone = warehouseZoneService.getZoneEntity(request.getZoneCode());
        SkuLocation location = new SkuLocation();
        location.setSku(normalizedSku);
        location.setZone(zone);
        location.setShelfCode(normalizeShelf(request.getShelfCode()));
        location.setOnHandQuantity(validateQuantity(request.getOnHandQuantity()));

        return toResponse(skuLocationRepository.save(location));
    }

    @Transactional(readOnly = true)
    public List<SkuLocationResponse> getAllLocations() {
        return skuLocationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SkuLocationResponse getLocation(String sku) {
        return toResponse(getLocationEntity(sku));
    }

    @Transactional(readOnly = true)
    public SkuLocation getLocationEntity(String sku) {
        String normalizedSku = normalizeSku(sku);
        return skuLocationRepository.findBySkuIgnoreCase(normalizedSku)
                .orElseThrow(() -> new ResourceNotFoundException("SKU location not found for SKU: " + normalizedSku));
    }

    @Transactional
    public void decrementOnHand(String sku, int quantity) {
        SkuLocation location = getLocationEntity(sku);
        if (location.getOnHandQuantity() < quantity) {
            throw new IllegalArgumentException("Insufficient warehouse on-hand quantity for SKU: " + location.getSku());
        }
        location.setOnHandQuantity(location.getOnHandQuantity() - quantity);
        skuLocationRepository.save(location);
    }

    private SkuLocationResponse toResponse(SkuLocation location) {
        return SkuLocationResponse.builder()
                .id(location.getId())
                .sku(location.getSku())
                .zoneCode(location.getZone().getCode())
                .zoneName(location.getZone().getName())
                .shelfCode(location.getShelfCode())
                .onHandQuantity(location.getOnHandQuantity())
                .build();
    }

    private String normalizeSku(String sku) {
        if (sku == null || sku.isBlank()) {
            throw new IllegalArgumentException("SKU is required");
        }
        return sku.trim().toUpperCase();
    }

    private String normalizeShelf(String shelfCode) {
        if (shelfCode == null || shelfCode.isBlank()) {
            throw new IllegalArgumentException("Shelf code is required");
        }
        return shelfCode.trim().toUpperCase();
    }

    private int validateQuantity(Integer quantity) {
        if (quantity == null || quantity < 0) {
            throw new IllegalArgumentException("On-hand quantity must be zero or greater");
        }
        return quantity;
    }
}
