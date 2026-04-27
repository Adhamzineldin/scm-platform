package com.scm.warehouse_service.service;

import com.scm.warehouse_service.dto.WarehouseZoneRequest;
import com.scm.warehouse_service.dto.WarehouseZoneResponse;
import com.scm.warehouse_service.entity.WarehouseZone;
import com.scm.warehouse_service.exception.ConflictException;
import com.scm.warehouse_service.exception.ResourceNotFoundException;
import com.scm.warehouse_service.repository.WarehouseZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WarehouseZoneService {

    private final WarehouseZoneRepository warehouseZoneRepository;

    @Transactional
    public WarehouseZoneResponse createZone(WarehouseZoneRequest request) {
        String normalizedCode = normalizeCode(request.getCode());
        if (warehouseZoneRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new ConflictException("Zone already exists with code: " + normalizedCode);
        }

        WarehouseZone zone = new WarehouseZone();
        zone.setCode(normalizedCode);
        zone.setName(request.getName().trim());
        zone.setType(request.getType());
        zone.setDescription(blankToNull(request.getDescription()));

        return toResponse(warehouseZoneRepository.save(zone));
    }

    @Transactional(readOnly = true)
    public List<WarehouseZoneResponse> getAllZones() {
        return warehouseZoneRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WarehouseZone getZoneEntity(String code) {
        String normalizedCode = normalizeCode(code);
        return warehouseZoneRepository.findByCodeIgnoreCase(normalizedCode)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found with code: " + normalizedCode));
    }

    private WarehouseZoneResponse toResponse(WarehouseZone zone) {
        return WarehouseZoneResponse.builder()
                .id(zone.getId())
                .code(zone.getCode())
                .name(zone.getName())
                .type(zone.getType())
                .description(zone.getDescription())
                .active(zone.isActive())
                .build();
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Zone code is required");
        }
        return code.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
