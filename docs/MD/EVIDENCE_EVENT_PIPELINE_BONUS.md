# Event-Driven Bonus Evidence (One Page)

This page maps the review checklist directly to concrete evidence.

| Review item | Evidence in repo | Screenshot to attach |
|---|---|---|
| Workflow/event diagram from request -> queue -> worker -> result | `docs/diagrams/sequence/sequence-event-order-pipeline-overview.puml` | `docs/diagrams/evidence/01-event-workflow.png` |
| Queued jobs can be retried or dead-lettered safely | `@RetryableTopic` and `@DltHandler` in shipment and notification listeners | `docs/diagrams/evidence/02-retry-dlt-logs.png` |
| Autoscaling rule/policy for workers | `infra/ecs/worker-autoscaling/target-tracking-policies.json` and setup script | `docs/diagrams/evidence/03-ecs-autoscaling-policy.png` |
| Metrics: queue depth, processing rate, or scaling | Grafana dashboard `SCM Kafka Worker Observability` | `docs/diagrams/evidence/04-grafana-kafka-worker-metrics.png` |

## Capture checklist

- [ ] 01 Event workflow diagram rendered from PlantUML
- [ ] 02 Retry + DLT log excerpt while forcing a consumer failure
- [ ] 03 ECS autoscaling policy page from AWS console
- [ ] 04 Grafana panel showing lag + processing rate over time

## Suggested captions

- 01: "Order request is acknowledged quickly while queue workers complete long-running tasks."
- 02: "Failed event retries four times, then lands on DLT without blocking the pipeline."
- 03: "Worker task count scales from queue pressure and CPU utilization."
- 04: "Queue depth decreases as worker throughput increases under load."

