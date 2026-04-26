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
import com.scm.warehouse_service.exception.IllegalTaskStateException;
import com.scm.warehouse_service.exception.OrderServiceCallbackException;
import com.scm.warehouse_service.exception.ResourceNotFoundException;
import com.scm.warehouse_service.repository.PickingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PickingTaskService {

    private static final String DEFAULT_PACKING_SHELF = "PACKING-STAGE";

    private final PickingTaskRepository pickingTaskRepository;
    private final SkuLocationService skuLocationService;
    private final ItemMovementService itemMovementService;
    private final WarehouseZoneService warehouseZoneService;
    private final OrderServiceClient orderServiceClient;

    @Transactional
    public List<PickingTaskResponse> createTasksFromOrder(OrderTaskRequest request) {
        List<PickingTaskResponse> tasks = new ArrayList<>();
        for (OrderItemPayload item : request.getItems()) {
            PickingTaskRequest taskRequest = new PickingTaskRequest();
            taskRequest.setOrderId(request.getOrderId());
            taskRequest.setSku(item.getSku());
            taskRequest.setQuantity(item.getQuantity());
            taskRequest.setDestinationZoneCode("PACKING_AREA");
            tasks.add(createTask(taskRequest));
        }
        return tasks;
    }

    @Transactional
    public PickingTaskResponse createTask(PickingTaskRequest request) {
        SkuLocation location = skuLocationService.getLocationEntity(request.getSku());
        WarehouseZone destinationZone = warehouseZoneService.getZoneEntity(request.getDestinationZoneCode());

        PickingTask task = new PickingTask();
        task.setOrderId(request.getOrderId());
        task.setSku(location.getSku());
        task.setQuantity(request.getQuantity());
        task.setSourceZoneCode(location.getZone().getCode());
        task.setSourceShelfCode(location.getShelfCode());
        task.setDestinationZoneCode(destinationZone.getCode());
        task.setDestinationShelfCode(DEFAULT_PACKING_SHELF);
        task.setAssignedWorkerId(blankToNull(request.getAssignedWorkerId()));
        task.setStatus(TaskStatus.PENDING);

        return toResponse(pickingTaskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public List<PickingTaskResponse> getAllTasks(TaskStatus status) {
        List<PickingTask> tasks = status == null
                ? pickingTaskRepository.findAll()
                : pickingTaskRepository.findByStatusOrderByIdAsc(status);

        return tasks.stream()
                .map(this::toResponse)
                .toList();
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

        skuLocationService.decrementOnHand(savedTask.getSku(), savedTask.getQuantity());
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

        notifyOrderServiceIfOrderIsFullyPicked(savedTask.getOrderId(), workerId.trim());

        return toResponse(savedTask);
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
        boolean hasOpenTasks = pickingTaskRepository.existsByOrderIdAndStatusNot(orderId, TaskStatus.COMPLETED);
        if (hasOpenTasks) {
            return;
        }

        try {
            orderServiceClient.markWarehouseComplete(orderId, OrderCompletionRequest.builder()
                    .workerId(workerId)
                    .build());
        }
        catch (feign.FeignException ex) {
            throw new OrderServiceCallbackException("Order Service callback failed after completing warehouse tasks.", ex);
        }
    }
}
