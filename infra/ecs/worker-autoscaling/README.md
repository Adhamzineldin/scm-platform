# ECS Worker Autoscaling (CPU + Kafka Lag)

This directory defines target-tracking autoscaling policies for asynchronous worker services.

## Worker services covered

- `order-service`
- `shipment-service`
- `notification-service`

## Scaling signals

1. `ECSServiceAverageCPUUtilization` (predefined metric)
2. `SCM/Workers:ConsumerLag` (custom CloudWatch metric)

## Files

- `target-tracking-policies.json`: declarative scaling policy definitions
- `app-autoscaling-setup.sh`: registers scalable targets and applies policies via AWS CLI

## How to apply

```bash
cd "/data/University/Third Year Term 2/Distributed Systems & Cloud Computing/scm-platform"
chmod +x infra/ecs/worker-autoscaling/app-autoscaling-setup.sh
infra/ecs/worker-autoscaling/app-autoscaling-setup.sh
```

## Publishing `ConsumerLag` metric

You can publish lag metrics from your monitoring pipeline (for example, from a periodic bridge job that reads Prometheus `kafka_consumergroup_lag` and writes to CloudWatch):

```bash
aws cloudwatch put-metric-data \
  --namespace SCM/Workers \
  --metric-name ConsumerLag \
  --dimensions ServiceName=shipment-service \
  --value 125 \
  --unit Count
```

## Notes

- Target values are starter defaults and should be tuned from load test data.
- Keep cooldowns conservative to avoid oscillation.
- For strict FIFO workloads, consider raising `minCapacity` for critical services.

