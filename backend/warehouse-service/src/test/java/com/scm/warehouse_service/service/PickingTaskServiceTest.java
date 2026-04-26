package com.scm.warehouse_service.service;

import com.scm.warehouse_service.dto.OrderItemPayload;
import com.scm.warehouse_service.dto.OrderTaskRequest;
import com.scm.warehouse_service.dto.PickingTaskResponse;
import com.scm.warehouse_service.dto.SkuLocationRequest;
import com.scm.warehouse_service.dto.WarehouseZoneRequest;
import com.scm.warehouse_service.client.OrderServiceClient;
import com.scm.warehouse_service.entity.TaskStatus;
import com.scm.warehouse_service.entity.ZoneType;
import com.scm.warehouse_service.repository.ItemMovementRepository;
import com.scm.warehouse_service.repository.PickingTaskRepository;
import com.scm.warehouse_service.repository.SkuLocationRepository;
import com.scm.warehouse_service.repository.WarehouseZoneRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PickingTaskServiceTest {

    @MockitoBean
    private OrderServiceClient orderServiceClient;

    @Autowired
    private WarehouseZoneService warehouseZoneService;

    @Autowired
    private SkuLocationService skuLocationService;

    @Autowired
    private PickingTaskService pickingTaskService;

    @Autowired
    private PickingTaskRepository pickingTaskRepository;

    @Autowired
    private ItemMovementRepository itemMovementRepository;

    @Autowired
    private SkuLocationRepository skuLocationRepository;

    @Autowired
    private WarehouseZoneRepository warehouseZoneRepository;

    @BeforeEach
    void setUp() {
        itemMovementRepository.deleteAll();
        pickingTaskRepository.deleteAll();
        skuLocationRepository.deleteAll();
        warehouseZoneRepository.deleteAll();

        WarehouseZoneRequest storageZone = new WarehouseZoneRequest();
        storageZone.setCode("ZONE_A");
        storageZone.setName("Zone A");
        storageZone.setType(ZoneType.STORAGE);
        warehouseZoneService.createZone(storageZone);

        WarehouseZoneRequest packingZone = new WarehouseZoneRequest();
        packingZone.setCode("PACKING_AREA");
        packingZone.setName("Packing Area");
        packingZone.setType(ZoneType.PACKING);
        warehouseZoneService.createZone(packingZone);

        SkuLocationRequest locationRequest = new SkuLocationRequest();
        locationRequest.setSku("SKU-100");
        locationRequest.setZoneCode("ZONE_A");
        locationRequest.setShelfCode("A-01");
        locationRequest.setOnHandQuantity(20);
        skuLocationService.assignLocation(locationRequest);
    }

    @Test
    void createTasksFromOrderShouldGeneratePickingTask() {
        OrderTaskRequest request = new OrderTaskRequest();
        request.setOrderId(101L);
        request.setShippingAddress("Cairo");

        OrderItemPayload item = new OrderItemPayload();
        item.setSku("SKU-100");
        item.setQuantity(2);
        request.setItems(List.of(item));

        List<PickingTaskResponse> tasks = pickingTaskService.createTasksFromOrder(request);

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getStatus()).isEqualTo(TaskStatus.PENDING);
        assertThat(tasks.get(0).getSourceZoneCode()).isEqualTo("ZONE_A");
        assertThat(tasks.get(0).getDestinationZoneCode()).isEqualTo("PACKING_AREA");
    }

    @Test
    void completingTaskShouldRecordMovementAndReduceOnHand() {
        OrderTaskRequest request = new OrderTaskRequest();
        request.setOrderId(102L);
        request.setShippingAddress("Alex");

        OrderItemPayload item = new OrderItemPayload();
        item.setSku("SKU-100");
        item.setQuantity(3);
        request.setItems(List.of(item));

        PickingTaskResponse task = pickingTaskService.createTasksFromOrder(request).get(0);
        pickingTaskService.startTask(task.getId(), "worker-1");
        PickingTaskResponse completed = pickingTaskService.completeTask(task.getId(), "worker-1");

        assertThat(completed.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(skuLocationService.getLocation("SKU-100").getOnHandQuantity()).isEqualTo(17);
    }
}
