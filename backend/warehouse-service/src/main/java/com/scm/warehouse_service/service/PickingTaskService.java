package com.scm.warehouse_service.service;

import com.scm.warehouse_service.client.OrderServiceClient;
import com.scm.warehouse_service.dto.OrderCompletionRequest;
import com.scm.warehouse_service.dto.OrderItemPayload;
import com.scm.warehouse_service.dto.OrderTaskRequest;
import com.scm.warehouse_service.dto.PickingTaskRequest;
import com.scm.warehouse_service.dto.PickingTaskResponse;
import com.scm.warehouse_service.entity.MovementType;
import com.scm.warehouse_service.entity.PickingTask;
import com.scm.warehouse_service.entity.SkuLocation;
import com.scm.warehouse_service.entity.TaskStatus;
import com.scm.warehouse_service.entity.WarehouseZone;
import com.scm.warehouse_service.entity.ZoneType;
import com.scm.warehouse_service.exception.IllegalTaskStateException;
import com.scm.warehouse_service.exception.ResourceNotFoundException;
import com.scm.warehouse_service.repository.PickingTaskRepository;
import com.scm.warehouse_service.repository.WarehouseZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PickingTaskService {

    private static final String DEFAULT_PACKING_ZONE  = "PACK-01";
    private static final String DEFAULT_STORAGE_ZONE  = "STOR-01";
    private static final String DEFAULT_PACKING_SHELF = "PACKING-STAGE";
    private static final String UNREGISTERED_SHELF    = "UNREGISTERED";

    private final PickingTaskRepository pickingTaskRepository;
    private final SkuLocationService skuLocationService;
    private final ItemMovementService itemMovementService;
    private final WarehouseZoneService warehouseZoneService;
    private final WarehouseZoneRepository warehouseZoneRepository;
    private final OrderServiceClient orderServiceClient;

    @Transactional
    public List<PickingTaskResponse> createTasksFromOrder(OrderTaskRequest request) {
        List<PickingTaskResponse> tasks = new ArrayList<>();
        List<String> failures = new ArrayList<>();
        for (OrderItemPayload item : request.getItems()) {
            try {
                PickingTaskRequest taskRequest = new PickingTaskRequest();
                taskRequest.setOrderId(request.getOrderId());
                taskRequest.setSku(item.getSku());
                taskRequest.setQuantity(item.getQuantity());
                taskRequest.setDestinationZoneCode(DEFAULT_PACKING_ZONE);
                tasks.add(createTask(taskRequest));
            } catch (Exception ex) {
                log.error("Failed to create picking task for SKU {} (Order #{}): {}",
                        item.getSku(), request.getOrderId(), ex.getMessage());
                failures.add(item.getSku() + ": " + ex.getMessage());
            }
        }
        if (tasks.isEmpty() && !request.getItems().isEmpty()) {
            // No task was created at all — surface this so order-service logs an error and the
            // VALIDATED order isn't silently left without any picking work.
            throw new IllegalStateException(
                    "No picking tasks could be created for order #" + request.getOrderId() +
                    ". Causes: " + String.join("; ", failures));
        }
        log.info("Created {}/{} picking tasks for order #{}",
                tasks.size(), request.getItems().size(), request.getOrderId());
        return tasks;
    }

    @Transactional
    public PickingTaskResponse createTask(PickingTaskRequest request) {
        // Resolve destination zone — fall back to any PACKING zone, then any active zone
        WarehouseZone destinationZone = resolveZone(request.getDestinationZoneCode(), ZoneType.PACKING);

        // Resolve source location — use registered SKU location if available, otherwise default to storage
        String sourceZoneCode;
        String sourceShelfCode;
        try {
            SkuLocation location = skuLocationService.getLocationEntity(request.getSku());
            sourceZoneCode = location.getZone().getCode();
            sourceShelfCode = location.getShelfCode();
        } catch (ResourceNotFoundException ex) {
            log.warn("No registered SKU location for {} — creating task with default storage location. " +
                     "Warehouse specialist should verify physical location.", request.getSku());
            WarehouseZone storageZone = resolveZone(DEFAULT_STORAGE_ZONE, ZoneType.STORAGE);
            sourceZoneCode = storageZone.getCode();
            sourceShelfCode = UNREGISTERED_SHELF;
        }

        PickingTask task = new PickingTask();
        task.setOrderId(request.getOrderId());
        task.setSku(request.getSku().trim().toUpperCase());
        task.setQuantity(request.getQuantity());
        task.setSourceZoneCode(sourceZoneCode);
        task.setSourceShelfCode(sourceShelfCode);
        task.setDestinationZoneCode(destinationZone.getCode());
        task.setDestinationShelfCode(DEFAULT_PACKING_SHELF);
        task.setAssignedWorkerId(blankToNull(request.getAssignedWorkerId()));
        task.setStatus(TaskStatus.PENDING);

        return toResponse(pickingTaskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public Page<PickingTaskResponse> getAllTasks(TaskStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("id").ascending());
        Page<PickingTask> tasks = status == null
                ? pickingTaskRepository.findAll(pageable)
                : pickingTaskRepository.findByStatus(status, pageable);

        return tasks.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PickingTaskResponse> getTasksForOrder(Long orderId) {
        return pickingTaskRepository.findByOrderIdOrderByIdAsc(orderId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PickingTaskResponse startTask(Long taskId, String workerId) {
        PickingTask task = getTaskEntity(taskId);
        if (task.getStatus() != TaskStatus.PENDING) {
            throw new IllegalTaskStateException("Task can only be started from PENDING state");
        }
        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setAssignedWorkerId(workerId.trim());
        return toResponse(pickingTaskRepository.save(task));
    }

    @Transactional
    public PickingTaskResponse completeTask(Long taskId, String workerId) {
        PickingTask task = getTaskEntity(taskId);
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new IllegalTaskStateException("Task is already completed");
        }
        if (task.getStatus() == TaskStatus.PENDING) {
            throw new IllegalTaskStateException("Task must be started before completion");
        }

        task.setStatus(TaskStatus.COMPLETED);
        task.setAssignedWorkerId(workerId.trim());
        PickingTask savedTask = pickingTaskRepository.save(task);

        // Decrement on-hand quantity if a SKU location is registered — skip gracefully if not
        try {
            skuLocationService.decrementOnHand(savedTask.getSku(), savedTask.getQuantity());
        } catch (ResourceNotFoundException ex) {
            log.warn("No SKU location registered for {} — skipping on-hand decrement", savedTask.getSku());
        }

        itemMovementService.recordMovement(
                savedTask.getSku(),
                savedTask.getQuantity(),
                savedTask.getSourceZoneCode(),
                savedTask.getSourceShelfCode(),
                savedTask.getDestinationZoneCode(),
                savedTask.getDestinationShelfCode(),
                MovementType.PICKED_FOR_ORDER,
                savedTask.getId(),
                workerId.trim()
        );

        final Long orderId = savedTask.getOrderId();
        final String trimmedWorkerId = workerId.trim();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                notifyOrderServiceIfOrderIsFullyPicked(orderId, trimmedWorkerId);
            }
        });

        return toResponse(savedTask);
    }

    @Transactional
    public PickingTaskResponse cancelTask(Long taskId) {
        PickingTask task = getTaskEntity(taskId);
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new IllegalTaskStateException("Cannot cancel a completed task");
        }
        if (task.getStatus() == TaskStatus.CANCELLED) {
            throw new IllegalTaskStateException("Task is already cancelled");
        }
        task.setStatus(TaskStatus.CANCELLED);
        return toResponse(pickingTaskRepository.save(task));
    }

    // ──────────────────────────── helpers ────────────────────────────

    private WarehouseZone resolveZone(String preferredCode, ZoneType fallbackType) {
        // 1. Try exact code
        Optional<WarehouseZone> byCode = warehouseZoneRepository.findByCodeIgnoreCase(preferredCode);
        if (byCode.isPresent()) return byCode.get();

        // 2. Try any zone of the fallback type
        Optional<WarehouseZone> byType = warehouseZoneRepository.findFirstByTypeAndActiveTrue(fallbackType);
        if (byType.isPresent()) {
            log.warn("Zone '{}' not found — using fallback zone '{}' (type={})",
                    preferredCode, byType.get().getCode(), fallbackType);
            return byType.get();
        }

        // 3. Any active zone at all
        return warehouseZoneRepository.findFirstByActiveTrue()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No warehouse zones configured. Please create at least one zone before processing orders."));
    }

    private PickingTask getTaskEntity(Long id) {
        return pickingTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Picking task not found with id: " + id));
    }

    private PickingTaskResponse toResponse(PickingTask task) {
        return PickingTaskResponse.builder()
                .id(task.getId())
                .orderId(task.getOrderId())
                .sku(task.getSku())
                .quantity(task.getQuantity())
                .sourceZoneCode(task.getSourceZoneCode())
                .sourceShelfCode(task.getSourceShelfCode())
                .destinationZoneCode(task.getDestinationZoneCode())
                .destinationShelfCode(task.getDestinationShelfCode())
                .assignedWorkerId(task.getAssignedWorkerId())
                .status(task.getStatus())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void notifyOrderServiceIfOrderIsFullyPicked(Long orderId, String workerId) {
        boolean hasOpenTasks = pickingTaskRepository.existsByOrderIdAndStatusIn(
                orderId, java.util.List.of(TaskStatus.PENDING, TaskStatus.IN_PROGRESS));
        if (hasOpenTasks) return;

        try {
            orderServiceClient.markWarehouseComplete(orderId, OrderCompletionRequest.builder()
                    .workerId(workerId)
                    .build());
            log.info("Order #{} marked PICKED in order-service after all tasks completed", orderId);
        } catch (Exception ex) {
            log.error("Order Service callback failed for order #{} — tasks are committed, manual status update may be needed: {}",
                    orderId, ex.getMessage());
        }
    }
}
