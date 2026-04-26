package com.scm.warehouse_service.repository;

import com.scm.warehouse_service.entity.SkuLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkuLocationRepository extends JpaRepository<SkuLocation, Long> {
    Optional<SkuLocation> findBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCase(String sku);
}
