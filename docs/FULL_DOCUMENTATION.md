# SCM Platform - Full Documentation

## 1) Purpose and Scope

SCM Platform is a microservices-based logistics application with both synchronous APIs and asynchronous event processing. This document consolidates architecture, API routing, event workflows, autoscaling strategy, and observability for the bonus requirement:

- Event-driven order pipeline with queue-based workers
- Safe retry and dead-letter handling
- Autoscaling workers from CPU and Kafka lag
- Metrics and dashboard evidence

## 2) System Architecture

PlantUML sources are in `docs/diagrams`.

- System context: `docs/diagrams/system-context.puml`
- Container architecture: `docs/diagrams/container-architecture.puml`
- Local deployment: `docs/diagrams/deployment-local.puml`
- AWS deployment: `docs/diagrams/deployment-aws.puml`
- Event pipeline: `docs/diagrams/event-driven-order-pipeline.puml`
- API map: `docs/diagrams/api-map.puml`

## 3) API Map (Gateway -> Services)

Source of truth: `backend/api-gateway/src/main/java/com/scm/api_gateway/config/GatewayConfig.java`.

| Route prefix | Destination service |
|---|---|
| `/api/auth/**`, `/api/users/**`, `/api/admin/**`, `/api/dashboard/**` | `auth-service` |
| `/api/orders/**` | `order-service` |
| `/api/inventory/**`, `/api/products/**` | `inventory-service` |
| `/api/shipments/**` | `shipment-service` |
| `/api/warehouse/**` | `warehouse-service` |
| `/api/notifications/**` | `notification-service` |
| `/api/documents/**` | `document-gen-service` |
| `/api/carts/**` | `cart-service` |

## 4) Event-Driven Pipeline

### 4.1 Main flow

1. Customer places order via `POST /api/orders`.
2. `order-service` persists order and publishes `order-created-topic`.
3. `warehouse-service` completes picking and emits `warehouse-order-packed`.
4. `order-service` listens and emits `order-ready-for-dispatch-topic`.
5. `shipment-service` worker consumes event, creates shipment, emits `shipment-dispatched-topic`.
6. `notification-service` worker consumes and sends outbound email.

### 4.2 Reliability behavior

- Consumers use `@RetryableTopic(attempts = "4")`.
- Failed messages are routed to dead-letter topics and handled by `@DltHandler`.
- Implemented in:
  - `backend/shipment-service/src/main/java/com/scm/shipment_service/listener/ShipmentEventListener.java`
  - `backend/notification-service/src/main/java/com/scm/notification/listener/OrderEventListener.java`
  - `backend/notification-service/src/main/java/com/scm/notification/listener/OrderStatusEventListener.java`
  - `backend/notification-service/src/main/java/com/scm/notification/listener/ShipmentEventListener.java`

## 5) Autoscaling Workers on ECS

Files:

- `infra/ecs/worker-autoscaling/README.md`
- `infra/ecs/worker-autoscaling/target-tracking-policies.json`
- `infra/ecs/worker-autoscaling/app-autoscaling-setup.sh`

Strategy:

- Scale out when average CPU is high (`ECSServiceAverageCPUUtilization`).
- Scale out when Kafka consumer lag is high (custom CloudWatch metric namespace `SCM/Workers`, metric `ConsumerLag`).
- Services targeted as workers: `order-service`, `shipment-service`, `notification-service`.

## 6) Monitoring and Metrics Pipeline

Files:

- Prometheus scraping: `docker/prometheus/prometheus.yml`
- Monitoring setup docs: `infra/monitoring/README.md`
- Grafana provisioning:
  - `infra/monitoring/grafana/provisioning/datasources/datasource.yml`
  - `infra/monitoring/grafana/provisioning/dashboards/dashboard.yml`
- Dashboard JSON: `infra/monitoring/grafana/dashboards/kafka-worker-observability.json`

Components:

- `kafka-exporter` publishes consumer lag metrics to Prometheus.
- Kafka broker JMX metrics are exported on port `7071` via Java agent.
- Grafana dashboard visualizes:
  - Queue depth (consumer lag)
  - Broker message ingestion rate
  - Worker processing rate (Spring Kafka listener rate)

## 7) Local Verification Steps

```bash
cd "/data/University/Third Year Term 2/Distributed Systems & Cloud Computing/scm-platform"
docker compose --profile local up --build -d
```

```bash
# Prometheus targets
xdg-open http://localhost:9090/targets

# Grafana
xdg-open http://localhost:3001
```

Generate traffic from UI:

1. Place an order (customer flow).
2. Mark order as picked (warehouse flow).
3. Observe lag and processing-rate charts move in Grafana.

## 8) Evidence Artifacts

Use `docs/EVIDENCE_EVENT_PIPELINE_BONUS.md` as the review handout. It maps each checklist item to proof and screenshot placeholders.

