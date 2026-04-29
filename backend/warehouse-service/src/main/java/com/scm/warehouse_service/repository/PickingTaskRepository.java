package com.scm.warehouse_service.repository;

import com.scm.warehouse_service.entity.PickingTask;
import com.scm.warehouse_service.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PickingTaskRepository extends JpaRepository<PickingTask, Long> {
    List<PickingTask> findByOrderIdOrderByIdAsc(Long orderId);
    List<PickingTask> findByStatusOrderByIdAsc(TaskStatus status);
    boolean existsByOrderIdAndStatusNot(Long orderId, TaskStatus status);
    boolean existsByOrderIdAndStatusIn(Long orderId, java.util.List<TaskStatus> statuses);
}
