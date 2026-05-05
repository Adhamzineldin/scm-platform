package com.scm.warehouse_service.config;

import com.scm.warehouse_service.entity.PickingTask;
import com.scm.warehouse_service.entity.TaskStatus;
import com.scm.warehouse_service.repository.PickingTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds completed picking tasks for orders #3-7 (PICKED and DISPATCHED).
 * Order IDs are predictable only in a fresh local DB seeding run.
 *
 * @Order(2) ensures zones + SKU locations (Order 1) are seeded first.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class DemoPickingTaskSeeder implements ApplicationRunner {

    private final PickingTaskRepository pickingTaskRepository;

    private record TaskSeed(Long orderId, String sku, int qty,
                            String srcZone, String srcShelf,
                            String dstZone, String dstShelf,
                            String worker) {}

    private static final List<TaskSeed> TASKS = List.of(
        // Order 3 (carol, PICKED)
        new TaskSeed(3L, "KEYBOARD-001", 1, "STOR-01", "B-01", "PICK-01", "P-01", "grace.warehouse"),
        new TaskSeed(3L, "MOUSE-001",    1, "STOR-01", "B-02", "PICK-01", "P-01", "grace.warehouse"),
        // Order 4 (david, PICKED)
        new TaskSeed(4L, "MONITOR-001",  1, "STOR-01", "B-03", "PICK-01", "P-02", "grace.warehouse"),
        // Order 5 (alice, DISPATCHED)
        new TaskSeed(5L, "TABLET-001",   1, "STOR-01", "A-03", "PICK-01", "P-01", "grace.warehouse"),
        new TaskSeed(5L, "WEBCAM-001",   1, "STOR-01", "B-04", "PICK-01", "P-01", "grace.warehouse"),
        new TaskSeed(5L, "CABLE-001",    1, "STOR-01", "C-02", "PICK-01", "P-01", "grace.warehouse"),
        // Order 6 (bob, DISPATCHED)
        new TaskSeed(6L, "SSD-001",      2, "STOR-01", "C-01", "PICK-01", "P-02", "grace.warehouse"),
        new TaskSeed(6L, "SPEAKER-001",  1, "STOR-01", "D-02", "PICK-01", "P-02", "grace.warehouse"),
        // Order 7 (carol, DISPATCHED + delivered)
        new TaskSeed(7L, "CHAIR-001",    1, "STOR-01", "C-03", "SHIP-01", "S-01", "grace.warehouse"),
        new TaskSeed(7L, "CABLE-001",    3, "STOR-01", "C-02", "SHIP-01", "S-01", "grace.warehouse")
    );

    @Override
    public void run(ApplicationArguments args) {
        if (pickingTaskRepository.count() > 0) {
            log.info("[DemoPickingTaskSeeder] Picking tasks already present — skipping.");
            return;
        }

        for (TaskSeed seed : TASKS) {
            PickingTask task = new PickingTask();
            task.setOrderId(seed.orderId());
            task.setSku(seed.sku());
            task.setQuantity(seed.qty());
            task.setSourceZoneCode(seed.srcZone());
            task.setSourceShelfCode(seed.srcShelf());
            task.setDestinationZoneCode(seed.dstZone());
            task.setDestinationShelfCode(seed.dstShelf());
            task.setAssignedWorkerId(seed.worker());
            task.setStatus(TaskStatus.COMPLETED);
            pickingTaskRepository.save(task);
        }

        log.info("[DemoPickingTaskSeeder] Seeded {} completed picking tasks for orders #3-7.", TASKS.size());
    }
}
