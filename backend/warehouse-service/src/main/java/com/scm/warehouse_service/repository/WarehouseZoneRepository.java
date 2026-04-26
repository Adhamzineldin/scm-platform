package com.scm.warehouse_service.repository;

import com.scm.warehouse_service.entity.WarehouseZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WarehouseZoneRepository extends JpaRepository<WarehouseZone, Long> {
    boolean existsByCodeIgnoreCase(String code);
    Optional<WarehouseZone> findByCodeIgnoreCase(String code);
}
