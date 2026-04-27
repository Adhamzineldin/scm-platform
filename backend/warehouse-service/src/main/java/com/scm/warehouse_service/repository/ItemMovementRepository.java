package com.scm.warehouse_service.repository;

import com.scm.warehouse_service.entity.ItemMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemMovementRepository extends JpaRepository<ItemMovement, Long> {
    List<ItemMovement> findBySkuIgnoreCaseOrderByMovedAtDesc(String sku);
}
