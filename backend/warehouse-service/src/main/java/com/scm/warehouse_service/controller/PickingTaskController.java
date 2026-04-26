package com.scm.warehouse_service.controller;

import com.scm.warehouse_service.dto.OrderTaskRequest;
import com.scm.warehouse_service.dto.PickingTaskRequest;
import com.scm.warehouse_service.dto.PickingTaskResponse;
import com.scm.warehouse_service.dto.TaskStatusUpdateRequest;
import com.scm.warehouse_service.entity.TaskStatus;
import com.scm.warehouse_service.service.PickingTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse")
@RequiredArgsConstructor
public class PickingTaskController {

    private final PickingTaskService pickingTaskService;

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public List<PickingTaskResponse> createTasksFromOrder(@Valid @RequestBody OrderTaskRequest request) {
        return pickingTaskService.createTasksFromOrder(request);
    }

    @PostMapping("/manual-tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public PickingTaskResponse createTask(@Valid @RequestBody PickingTaskRequest request) {
        return pickingTaskService.createTask(request);
    }

    @GetMapping("/tasks")
    @ResponseStatus(HttpStatus.OK)
    public List<PickingTaskResponse> getTasks(@RequestParam(required = false) TaskStatus status) {
        return pickingTaskService.getAllTasks(status);
    }

    @GetMapping("/orders/{orderId}/tasks")
    @ResponseStatus(HttpStatus.OK)
    public List<PickingTaskResponse> getTasksForOrder(@PathVariable Long orderId) {
        return pickingTaskService.getTasksForOrder(orderId);
    }

    @PatchMapping("/tasks/{taskId}/start")
    @ResponseStatus(HttpStatus.OK)
    public PickingTaskResponse startTask(@PathVariable Long taskId, @Valid @RequestBody TaskStatusUpdateRequest request) {
        return pickingTaskService.startTask(taskId, request.getWorkerId());
    }

    @PatchMapping("/tasks/{taskId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public PickingTaskResponse completeTask(@PathVariable Long taskId, @Valid @RequestBody TaskStatusUpdateRequest request) {
        return pickingTaskService.completeTask(taskId, request.getWorkerId());
    }
}
