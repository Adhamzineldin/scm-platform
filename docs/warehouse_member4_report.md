# Warehouse Service Implementation Report

## 1. Overview

This report documents the work completed for **Member 4 - Warehouse Service** in the Logistics and Warehouse Operations Platform.

The goal was to transform the existing `warehouse-service` from a minimal Spring Boot scaffold into a working microservice responsible for:

- Warehouse zones management
- SKU physical location tracking
- Picking task creation and lifecycle management
- Item movement traceability
- Integration with `order-service`
- Dockerized deployment and monitoring readiness

---

## 2. Initial State Before Implementation

Before the implementation:

- `backend/warehouse-service` contained only:
  - `WarehouseServiceApplication.java`
  - `application.properties`
  - default test file
- There was no:
  - business logic
  - database model
  - REST API
  - Dockerfile
  - integration with orders

So the service was effectively an empty scaffold.

---

## 3. Main Work Completed in Warehouse Service

### 3.1 Project Setup and Dependencies

Updated:

- `backend/warehouse-service/pom.xml`

Added support for:

- Spring Web
- Spring Data JPA
- Validation
- Actuator
- Prometheus metrics
- Eureka client
- OpenFeign
- Springdoc OpenAPI
- PostgreSQL
- H2 for tests

### 3.2 Docker Support

Added:

- `backend/warehouse-service/Dockerfile`

Purpose:

- Build the warehouse service as a container
- Run it independently as part of the platform

### 3.3 Service Configuration

Updated:

- `backend/warehouse-service/src/main/resources/application.properties`

Configured:

- service name
- port `2504`
- datasource
- JPA settings
- Swagger/OpenAPI
- Eureka settings
- Prometheus actuator endpoint
- `order.service.url`

---

## 4. Business Modules Implemented in Warehouse Service

### 4.1 Warehouse Zones

Implemented support for warehouse zones such as:

- `ZONE_A`
- `ZONE_B`
- `PACKING_AREA`

Files added:

- `entity/WarehouseZone.java`
- `entity/ZoneType.java`
- `dto/WarehouseZoneRequest.java`
- `dto/WarehouseZoneResponse.java`
- `repository/WarehouseZoneRepository.java`
- `service/WarehouseZoneService.java`
- `controller/WarehouseZoneController.java`

Features:

- Create zones
- List zones
- Normalize zone codes
- Prevent duplicate zones

### 4.2 SKU Physical Locations

Implemented physical mapping between SKU and warehouse location.

Files added:

- `entity/SkuLocation.java`
- `dto/SkuLocationRequest.java`
- `dto/SkuLocationResponse.java`
- `repository/SkuLocationRepository.java`
- `service/SkuLocationService.java`
- `controller/SkuLocationController.java`

Features:

- Assign a SKU to a zone and shelf
- Fetch all SKU locations
- Fetch a specific SKU location
- Track on-hand warehouse quantity

### 4.3 Picking Tasks

Implemented the core warehouse execution model.

Files added:

- `entity/PickingTask.java`
- `entity/TaskStatus.java`
- `dto/PickingTaskRequest.java`
- `dto/PickingTaskResponse.java`
- `dto/TaskStatusUpdateRequest.java`
- `dto/OrderItemPayload.java`
- `dto/OrderTaskRequest.java`
- `repository/PickingTaskRepository.java`
- `service/PickingTaskService.java`
- `controller/PickingTaskController.java`

Features:

- Create picking tasks from approved order data
- Create manual tasks
- Track task lifecycle:
  - `PENDING`
  - `IN_PROGRESS`
  - `COMPLETED`
- Start task
- Complete task
- List all tasks
- List tasks for a specific order

### 4.4 Item Movements and Traceability

Implemented internal movement traceability.

Files added:

- `entity/ItemMovement.java`
- `entity/MovementType.java`
- `dto/ItemMovementResponse.java`
- `repository/ItemMovementRepository.java`
- `service/ItemMovementService.java`
- `controller/ItemMovementController.java`

Features:

- Record movement when an item is picked
- Track source zone and shelf
- Track destination zone and shelf
- Retrieve full movement history
- Retrieve movement history by SKU

---

## 5. Error Handling and API Documentation

### 5.1 Exception Handling

Added:

- `dto/ErrorResponse.java`
- `exception/GlobalExceptionHandler.java`
- `exception/ResourceNotFoundException.java`
- `exception/ConflictException.java`
- `exception/IllegalTaskStateException.java`
- `exception/OrderServiceCallbackException.java`

Purpose:

- Return structured API errors
- Handle missing resources
- Handle duplicates
- Handle invalid task state transitions
- Handle integration callback failure

### 5.2 OpenAPI / Swagger

Added:

- `config/OpenApiConfig.java`
- `src/main/resources/static/openapi/warehouse-service.yaml`

Purpose:

- Provide service contract documentation
- Make endpoints easier for teammates to integrate with

---

## 6. Integration Added Between Warehouse and Order Services

The warehouse flow needed to be connected to the order flow so the microservice could operate as part of the platform.

### 6.1 Order Service -> Warehouse Service

When an order is created successfully in `order-service`, the system now creates warehouse picking tasks automatically.

This required changes in `order-service`.

Added in `order-service`:

- `dto/warehouse/OrderItemPayload.java`
- `dto/warehouse/OrderTaskRequest.java`
- `exception/WarehouseIntegrationException.java`

Updated:

- `client/WarehouseClient.java`
- `services/OrderService.java`
- `resources/application.yml`
- `exception/GlobalExceptionHandler.java`

Purpose:

- Convert order data into warehouse task creation request
- Send request to `warehouse-service`
- Handle warehouse integration errors cleanly

### 6.2 Warehouse Service -> Order Service Callback

When all warehouse tasks for an order are completed, the warehouse service now calls back the order service to mark the order as picked.

Added in `warehouse-service`:

- `client/OrderServiceClient.java`
- `dto/OrderCompletionRequest.java`

Updated:

- `services/PickingTaskService.java`

Purpose:

- After final task completion:
  - detect that all tasks are completed
  - notify `order-service`
  - update order status to `PICKED`

### 6.3 New Callback Endpoint in Order Service

Added in `order-service`:

- `dto/warehouse/WarehouseCompletionRequest.java`

Updated:

- `controllers/OrderController.java`
- `services/OrderService.java`

New endpoint:

- `PATCH /api/orders/{orderId}/warehouse-complete`

Purpose:

- accept completion callback from warehouse
- mark order as `PICKED`
- continue dispatch workflow

---

## 7. Infrastructure Changes

To make the warehouse service run as part of the platform, the following shared files were updated.

### 7.1 Docker Compose

Updated:

- `docker-compose.yml`

Added:

- `warehouse-service`

Configured:

- build context
- port mapping `2504:2504`
- database connection
- order service callback URL

Also updated `order-service` environment variables so it can call warehouse.

### 7.2 Database Initialization

Updated:

- `docker/postgres/init/01-create-order-db.sql`

Added database:

- `scm_warehouse_db`

### 7.3 Prometheus Monitoring

Updated:

- `docker/prometheus/prometheus.yml`

Added scrape target:

- `warehouse-service:2504`

---

## 8. Tests Added and Updated

### 8.1 Warehouse Service Tests

Added:

- `src/test/resources/application.properties`
- `src/test/java/com/scm/warehouse_service/service/PickingTaskServiceTest.java`

Verified:

- creating picking tasks from order data
- completing tasks
- reducing on-hand quantity
- recording item movement

### 8.2 Order Service Tests

Updated existing tests in `order-service` so they match the new warehouse integration:

- `OrderControllerTest.java`
- `OrderServiceTest.java`
- `OrderServiceLoadTest.java`
- `GlobalExceptionHandlerTest.java`

Purpose:

- validate new endpoint
- validate warehouse callback behavior
- fix test mocks for new integration dependency

---

## 9. Files Added in Warehouse Service

### Root / Config

- `backend/warehouse-service/Dockerfile`
- `backend/warehouse-service/src/main/resources/static/openapi/warehouse-service.yaml`
- `backend/warehouse-service/src/test/resources/application.properties`

### Config

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/config/OpenApiConfig.java`

### Client

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/client/OrderServiceClient.java`

### DTOs

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/ErrorResponse.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/OrderCompletionRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/OrderItemPayload.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/OrderTaskRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/PickingTaskRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/PickingTaskResponse.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/TaskStatusUpdateRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/WarehouseZoneRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/WarehouseZoneResponse.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/SkuLocationRequest.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/SkuLocationResponse.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/dto/ItemMovementResponse.java`

### Entities

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/ZoneType.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/TaskStatus.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/MovementType.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/WarehouseZone.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/SkuLocation.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/PickingTask.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/entity/ItemMovement.java`

### Repositories

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/repository/WarehouseZoneRepository.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/repository/SkuLocationRepository.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/repository/PickingTaskRepository.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/repository/ItemMovementRepository.java`

### Exceptions

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/exception/GlobalExceptionHandler.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/exception/ResourceNotFoundException.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/exception/ConflictException.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/exception/IllegalTaskStateException.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/exception/OrderServiceCallbackException.java`

### Services

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/service/WarehouseZoneService.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/service/SkuLocationService.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/service/ItemMovementService.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/service/PickingTaskService.java`

### Controllers

- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/controller/WarehouseZoneController.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/controller/SkuLocationController.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/controller/PickingTaskController.java`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/controller/ItemMovementController.java`

### Tests

- `backend/warehouse-service/src/test/java/com/scm/warehouse_service/service/PickingTaskServiceTest.java`

---

## 10. Files Updated in Warehouse Service

- `backend/warehouse-service/pom.xml`
- `backend/warehouse-service/src/main/java/com/scm/warehouse_service/WarehouseServiceApplication.java`
- `backend/warehouse-service/src/main/resources/application.properties`

---

## 11. Files Updated Outside Warehouse Service

### Order Service

- `backend/order-service/src/main/java/com/scm/order_service/client/WarehouseClient.java`
- `backend/order-service/src/main/java/com/scm/order_service/controllers/OrderController.java`
- `backend/order-service/src/main/java/com/scm/order_service/exception/GlobalExceptionHandler.java`
- `backend/order-service/src/main/java/com/scm/order_service/services/OrderService.java`
- `backend/order-service/src/main/resources/application.yml`
- `backend/order-service/src/test/java/com/scm/order_service/controllers/OrderControllerTest.java`
- `backend/order-service/src/test/java/com/scm/order_service/exception/GlobalExceptionHandlerTest.java`
- `backend/order-service/src/test/java/com/scm/order_service/load/OrderServiceLoadTest.java`
- `backend/order-service/src/test/java/com/scm/order_service/services/OrderServiceTest.java`

### Files Added in Order Service

- `backend/order-service/src/main/java/com/scm/order_service/dto/warehouse/OrderItemPayload.java`
- `backend/order-service/src/main/java/com/scm/order_service/dto/warehouse/OrderTaskRequest.java`
- `backend/order-service/src/main/java/com/scm/order_service/dto/warehouse/WarehouseCompletionRequest.java`
- `backend/order-service/src/main/java/com/scm/order_service/exception/WarehouseIntegrationException.java`

### Shared Infrastructure

- `docker-compose.yml`
- `docker/postgres/init/01-create-order-db.sql`
- `docker/prometheus/prometheus.yml`

---

## 12. How to Run the Project

### Option A - Run Tests Only

#### Warehouse service tests

```powershell
cd D:\scm-platform\backend\warehouse-service
mvn test
```

#### Order service tests

```powershell
cd D:\scm-platform\backend\order-service
mvn test
```

### Option B - Run Services with Docker

From project root:

```powershell
cd D:\scm-platform
docker compose up -d --build postgres inventory-service warehouse-service order-service
```

### Expected Ports

- `order-service` -> `http://localhost:2501`
- `inventory-service` -> `http://localhost:2502`
- `warehouse-service` -> `http://localhost:2504`
- `prometheus` -> `http://localhost:9090`

---

## 13. How to Test the Warehouse Flow Manually

### Step 1 - Create warehouse zones

```http
POST http://localhost:2504/api/warehouse/zones
Content-Type: application/json

{
  "code": "ZONE_A",
  "name": "Zone A",
  "type": "STORAGE",
  "description": "Main storage"
}
```

```http
POST http://localhost:2504/api/warehouse/zones
Content-Type: application/json

{
  "code": "PACKING_AREA",
  "name": "Packing Area",
  "type": "PACKING",
  "description": "Packing station"
}
```

### Step 2 - Assign SKU location

```http
POST http://localhost:2504/api/warehouse/locations
Content-Type: application/json

{
  "sku": "SKU-100",
  "zoneCode": "ZONE_A",
  "shelfCode": "A-01",
  "onHandQuantity": 20
}
```

### Step 3 - Create order

```http
POST http://localhost:2501/api/orders
X-User-Id: user-1
Content-Type: application/json

{
  "idempotencyKey": "order-001",
  "shippingAddress": "Cairo",
  "items": [
    {
      "sku": "SKU-100",
      "quantity": 2,
      "unitPrice": 100
    }
  ]
}
```

### Step 4 - Check warehouse tasks

```http
GET http://localhost:2504/api/warehouse/tasks
```

### Step 5 - Start task

```http
PATCH http://localhost:2504/api/warehouse/tasks/1/start
Content-Type: application/json

{
  "workerId": "worker-1"
}
```

### Step 6 - Complete task

```http
PATCH http://localhost:2504/api/warehouse/tasks/1/complete
Content-Type: application/json

{
  "workerId": "worker-1"
}
```

### Step 7 - Verify movement log

```http
GET http://localhost:2504/api/warehouse/movements
```

### Step 8 - Verify SKU quantity update

```http
GET http://localhost:2504/api/warehouse/locations/SKU-100
```

### Step 9 - Verify order status changed to PICKED

```http
GET http://localhost:2501/api/orders/my-orders
X-User-Id: user-1
```

---

## 14. Verification Results

The following verification was completed successfully:

- `warehouse-service` tests passed
- `order-service` tests passed after updating integration-related mocks
- warehouse and order flow now supports:
  - order creation
  - automatic warehouse task creation
  - task start
  - task completion
  - movement recording
  - callback to order service
  - order status update to `PICKED`

---

## 15. Important Note

During Maven testing, local dependency cache folders may appear:

- `D:\scm-platform\.m2`
- `D:\scm-platform\backend\warehouse-service\.m2`

These are not part of the business implementation. They were generated during dependency download and test execution.

