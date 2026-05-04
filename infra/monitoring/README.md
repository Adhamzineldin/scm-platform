# Monitoring Additions for Event-Driven Bonus

This folder contains the minimum observability artifacts requested by the bonus:

- Kafka lag metrics (`kafka-exporter`) scraped by Prometheus.
- Kafka broker JMX metrics (Java agent in local Kafka container) scraped by Prometheus.
- A pre-provisioned Grafana dashboard at:
  - `SCM / SCM Kafka Worker Observability`

## Quick verification

1. Start local stack with observability profile:

```bash
docker compose --profile local up --build -d
```

2. Confirm Prometheus targets are up:

- `http://localhost:9090/targets`
- look for `kafka-exporter` and `kafka-jmx` as `UP`

3. Open Grafana and view dashboard:

- `http://localhost:3001`
- user/password: `admin` / `admin`
- dashboard: `SCM Kafka Worker Observability`

4. Generate traffic by placing orders and marking them picked.
   Queue depth and processing-rate panels should move.

