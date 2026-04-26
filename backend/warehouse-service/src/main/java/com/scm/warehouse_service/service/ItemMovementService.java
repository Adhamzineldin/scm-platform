package com.scm.warehouse_service.service;

import com.scm.warehouse_service.dto.ItemMovementResponse;
import com.scm.warehouse_service.entity.ItemMovement;
import com.scm.warehouse_service.entity.MovementType;
import com.scm.warehouse_service.repository.ItemMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemMovementService {

    private final ItemMovementRepository itemMovementRepository;

    @Transactional
    public void recordMovement(String sku,
                               int quantity,
                               String fromZoneCode,
                               String fromShelfCode,
                               String toZoneCode,
                               String toShelfCode,
                               MovementType movementType,
                               Long taskId,
                               String performedBy) {
        ItemMovement movement = new ItemMovement();
        movement.setSku(sku);
        movement.setQuantity(quantity);
        movement.setFromZoneCode(fromZoneCode);
        movement.setFromShelfCode(fromShelfCode);
        movement.setToZoneCode(toZoneCode);
        movement.setToShelfCode(toShelfCode);
        movement.setMovementType(movementType);
        movement.setTaskId(taskId);
        movement.setPerformedBy(performedBy);

        itemMovementRepository.save(movement);
    }

    @Transactional(readOnly = true)
    public List<ItemMovementResponse> getAllMovements() {
        return itemMovementRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemMovementResponse> getMovementsForSku(String sku) {
        return itemMovementRepository.findBySkuIgnoreCaseOrderByMovedAtDesc(sku).stream()
                .map(this::toResponse)
                .toList();
    }

    private ItemMovementResponse toResponse(ItemMovement movement) {
        return ItemMovementResponse.builder()
                .id(movement.getId())
                .sku(movement.getSku())
                .quantity(movement.getQuantity())
                .fromZoneCode(movement.getFromZoneCode())
                .fromShelfCode(movement.getFromShelfCode())
                .toZoneCode(movement.getToZoneCode())
                .toShelfCode(movement.getToShelfCode())
                .movementType(movement.getMovementType())
                .taskId(movement.getTaskId())
                .performedBy(movement.getPerformedBy())
                .movedAt(movement.getMovedAt())
                .build();
    }
}
