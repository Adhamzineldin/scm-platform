# Deploying SCM Platform to AWS

This project is **AWS-toggleable**: the same Docker images run locally with the
bundled infra (postgres / kafka / eureka) and on AWS using managed services
(RDS / MSK / SES). The switch is just an env-file + a compose overlay.

## TL;DR — local vs AWS

```powershell
# LOCAL (everything in one docker-compose, no AWS needed)
docker compose up -d

# AWS-mode (RDS + MSK + SES, no local infra)
docker compose -f docker-compose.yml -f docker-compose.aws.yml up -d
```

The overlay `docker-compose.aws.yml`:
- removes `postgres`, `redis`, `kafka`, `zookeeper`, `kafka-ui`, `prometheus`, `grafana`
- re-points services at `${RDS_HOST}` / `${MSK_BOOTSTRAP_SERVERS}` / `${SES_HOST}`
- disables Eureka by default (`EUREKA_CLIENT_ENABLED=false`) — relies on
  ECS Service Connect DNS instead.

## Required AWS resources (cheapest configuration for a uni project)

| Resource | Tier | Approx. cost |
|---|---|---|
| **RDS Postgres** `db.t4g.micro`, single-AZ, 20 GB | Free Tier eligible 12 months | ~$0 |
| **MSK Serverless** (or Confluent Cloud free trial) | Pay per request | ~$0.05/hr if idle — **stop it when you're done!** |
| **ECS Fargate** 1 vCPU / 2 GB × 9 tasks | Pay per second | ~$0.05/hr per task |
| **ALB** | 1 LB | ~$0.025/hr |
| **SES** sandbox | Free up to 200 emails/day | $0 |
| **Secrets Manager** | $0.40/secret/month | ~$2/month |

> 💡 **Save credits**: stop the ECS service + delete the ALB + stop MSK whenever you're not demoing.
> Keep RDS — it's free for the first year on `t4g.micro`.

## Step-by-step (first time setup)

### 1. Create AWS resources
```bash
# RDS
aws rds create-db-instance \
  --db-instance-identifier scm \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <YourPassword> \
  --allocated-storage 20

# Once available, get the endpoint:
aws rds describe-db-instances --db-instance-identifier scm \
  --query "DBInstances[0].Endpoint.Address"
```

Then connect with `psql` and run the init SQL once:
```sql
CREATE DATABASE logistics_db;
CREATE DATABASE cart_db;
CREATE DATABASE scm_inventory_db;
CREATE DATABASE scm_order_db;
CREATE DATABASE scm_warehouse_db;
CREATE DATABASE scm_shipment_db;
```

### 2. Create your `.env` file
Copy `.env.example` → `.env` and fill in:
```env
RDS_HOST=scm.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=<YourPassword>

MSK_BOOTSTRAP_SERVERS=b-1.xxx.kafka.us-east-1.amazonaws.com:9092

SES_HOST=email-smtp.us-east-1.amazonaws.com
SES_USERNAME=<SES SMTP user>
SES_PASSWORD=<SES SMTP password>

JWT_SECRET=<generate with: openssl rand -base64 48>
API_BASE_URL=https://api.your-domain.com    # ALB DNS name works too
EUREKA_CLIENT_ENABLED=false
```

### 3. Push images to ECR
```powershell
aws ecr get-login-password --region us-east-1 | `
  docker login --username AWS --password-stdin <acct>.dkr.ecr.us-east-1.amazonaws.com

docker compose build
# Tag + push each one (script this in CI later)
docker tag scm-platform-order-service <acct>.dkr.ecr.us-east-1.amazonaws.com/scm/order-service:latest
docker push <acct>.dkr.ecr.us-east-1.amazonaws.com/scm/order-service:latest
# repeat for: api-gateway, auth-service, cart-service, inventory-service,
#             warehouse-service, shipment-service, notification-service,
#             document-gen-service, dashboard
```

### 4. Deploy on ECS Fargate
- Create **one task definition per service**, image = ECR URL
- Inject env vars from `.env` (or better: AWS Secrets Manager `valueFrom`)
- Put them all in **one ECS cluster** with **Service Connect** enabled —
  services can then call each other via DNS like `http://order-service:2501`
  (no Eureka needed)
- Put `api-gateway` and `dashboard` behind an **Application Load Balancer**:
  - `dashboard` → ALB target group on port 80
  - `api-gateway` → ALB target group on port 7080 with path `/api/*`

## How to test the AWS toggle WITHOUT spending anything

You can validate the overlay locally — run a second postgres + kafka on
different ports and pretend they are RDS / MSK:

```powershell
# Pretend "AWS"
$env:RDS_HOST              = "host.docker.internal"
$env:RDS_PORT              = "5434"     # the local postgres
$env:DB_USERNAME           = "admin"
$env:DB_PASSWORD           = "password"
$env:MSK_BOOTSTRAP_SERVERS = "host.docker.internal:9092"
$env:SES_HOST              = "smtp.gmail.com"
$env:SES_USERNAME          = "Adhams.Botmail@gmail.com"
$env:SES_PASSWORD          = "tkfp vsuh kybi jwbh"
$env:JWT_SECRET            = "logisticsSecretKeyForJwtMustBeLongEnough123456789"
$env:API_BASE_URL          = "http://localhost:7080"
$env:EUREKA_CLIENT_ENABLED = "false"

# 1) start ONLY the infra from the local file
docker compose up -d postgres kafka zookeeper

# 2) bring up everything else in "AWS-mode" pointing at that infra
docker compose -f docker-compose.yml -f docker-compose.aws.yml up -d `
  api-gateway auth-service cart-service inventory-service order-service `
  warehouse-service shipment-service notification-service document-gen-service `
  discovery-server dashboard
```

If everything still works → the same compose run **will** work against real
RDS / MSK once you swap the env values. You only pay AWS once you're sure.

## What's still NOT production-ready (called out for honesty)

| Item | Status | Why it's OK for a uni project |
|---|---|---|
| `spring.jpa.hibernate.ddl-auto=update` | ❌ should be `validate` + Flyway | Fine for demo; data loss risk in prod |
| Secrets in `.env` | ❌ should use Secrets Manager | OK locally; use `valueFrom` in ECS task def |
| No HTTPS between services | 🟡 ALB terminates TLS | Internal traffic in VPC is acceptable |
| Eureka single instance | 🟡 single point of failure | Disabled in AWS overlay → not an issue |
| No CI/CD | 🟡 manual `docker push` | Add GitHub Actions later if needed |

## Bonus artifacts (event-driven workers + autoscaling)

The repository now includes dedicated bonus documentation and infra templates:

- Full doc: `docs/FULL_DOCUMENTATION.md`
- Evidence one-pager: `docs/EVIDENCE_EVENT_PIPELINE_BONUS.md`
- PlantUML diagrams: `docs/diagrams/**/*.puml`
- ECS worker autoscaling policies:
  - `infra/ecs/worker-autoscaling/target-tracking-policies.json`
  - `infra/ecs/worker-autoscaling/app-autoscaling-setup.sh`
- Monitoring pipeline + dashboard:
  - `infra/monitoring/README.md`
  - `infra/monitoring/grafana/dashboards/kafka-worker-observability.json`

To apply worker autoscaling (CPU + Kafka lag metric):

```bash
chmod +x infra/ecs/worker-autoscaling/app-autoscaling-setup.sh
infra/ecs/worker-autoscaling/app-autoscaling-setup.sh
```

