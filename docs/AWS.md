# AWS Deployment — SCM Platform

**Account:** `310133718291`
**Region:** `eu-north-1` (Stockholm)
**VPC:** `vpc-034e3644d0eb4001f` — default VPC, CIDR `172.31.0.0/16`
**Subnets (3 AZs):**
| AZ | Subnet ID | CIDR |
|---|---|---|
| eu-north-1a | subnet-05ee7d681585b170e | 172.31.16.0/20 |
| eu-north-1b | subnet-097acae75ef1765c2 | 172.31.32.0/20 |
| eu-north-1c | subnet-0ea83e90d06e76d67 | 172.31.0.0/20  |

> **Why eu-north-1?** It's the region already configured in the local AWS CLI profile. Changing region mid-project introduces credential/endpoint drift; staying consistent is simpler.

> **Why the default VPC?** For a university project we don't need the isolation guarantees of a custom VPC. The default VPC has public subnets in every AZ, an internet gateway already attached, and route tables pre-wired — zero networking setup required.

---

## Services deployed

| Service | Port | Description |
|---|---|---|
| `api-gateway` | 7080 | Spring Cloud Gateway — single entry point for all API calls |
| `auth-service` | 8081 | JWT auth + user management, uses `logistics_db` |
| `cart-service` | 8083 | Shopping cart, uses `cart_db` |
| `inventory-service` | 2502 | Product inventory, uses `logistics_db` |
| `order-service` | 2501 | Order lifecycle + Kafka producer, uses `scm_order_db` |
| `shipment-service` | 2503 | Shipment tracking + Kafka consumer, uses `scm_shipment_db` |
| `warehouse-service` | 2504 | Warehouse/picking tasks, uses `scm_warehouse_db` |
| `notification-service` | 2505 | Email notifications via Kafka consumer |
| `document-gen-service` | 3050 | PDF/invoice generation (Node.js) |
| `discovery-server` | 8761 | Eureka — **disabled in AWS** (ECS Service Connect handles DNS) |
| `dashboard` | 80 | React frontend, built into nginx image |

---

## Step-by-step deployment log

Each step records: the exact command run, why that specific command/flag was chosen, and the output received.

---

### Step 1 — Security Groups

**Why before anything else?** RDS, MSK, and ECS all need security group IDs at creation time. Creating SGs first avoids circular dependency (can't reference a SG that doesn't exist yet).

**Why separate SGs per tier?** Least-privilege: the DB SG only allows inbound from the ECS SG, not from the internet. MSK SG only allows inbound from ECS. This limits blast radius if one tier is compromised.

#### 1a — ECS Security Group

```bash
aws ec2 create-security-group \
  --group-name scm-ecs-sg \
  --description "ECS tasks for SCM platform" \
  --vpc-id vpc-034e3644d0eb4001f
# → sg-0e4653fcd9cdf0ace

# Allow all traffic from itself (inter-service Service Connect calls)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0e4653fcd9cdf0ace --protocol all \
  --source-group sg-0e4653fcd9cdf0ace

# Allow all TCP from ALB (so ALB health checks and routing reach api-gateway + dashboard)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0e4653fcd9cdf0ace --protocol tcp --port 0-65535 \
  --source-group sg-0669c4f560f2599b7
```

**Result:** `sg-0e4653fcd9cdf0ace`

#### 1b — ALB Security Group

```bash
aws ec2 create-security-group \
  --group-name scm-alb-sg \
  --description "ALB for SCM platform - internet-facing" \
  --vpc-id vpc-034e3644d0eb4001f
# → sg-0669c4f560f2599b7

aws ec2 authorize-security-group-ingress \
  --group-id sg-0669c4f560f2599b7 --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-0669c4f560f2599b7 --protocol tcp --port 443 --cidr 0.0.0.0/0
```

**Result:** `sg-0669c4f560f2599b7`
**Inbound rules:** port 80 and 443 from `0.0.0.0/0` (internet-facing).
**Why 80 AND 443?** 80 for HTTP redirect to HTTPS; 443 for the actual traffic. Even without a custom domain, the ALB DNS name works over HTTP for demo purposes.

#### 1c — RDS Security Group

```bash
aws ec2 create-security-group \
  --group-name scm-rds-sg \
  --description "RDS Postgres for SCM platform - ECS only" \
  --vpc-id vpc-034e3644d0eb4001f
# → sg-017c60d16c294890e

# Only ECS tasks can reach Postgres — never the open internet
aws ec2 authorize-security-group-ingress \
  --group-id sg-017c60d16c294890e --protocol tcp --port 5432 \
  --source-group sg-0e4653fcd9cdf0ace
```

**Result:** `sg-017c60d16c294890e`
**Inbound rule:** port 5432 (Postgres) from ECS SG only — never from `0.0.0.0/0`.
**Why port 5432?** That is the standard Postgres port; all Spring Boot services use it via JDBC URLs.

#### 1d — MSK Security Group

```bash
aws ec2 create-security-group \
  --group-name scm-msk-sg \
  --description "MSK Kafka for SCM platform - ECS only" \
  --vpc-id vpc-034e3644d0eb4001f
# → sg-07539c8a901e950a5

# Port 9092 = plaintext Kafka, port 9098 = TLS (MSK Serverless requires 9098)
aws ec2 authorize-security-group-ingress \
  --group-id sg-07539c8a901e950a5 --protocol tcp --port 9092 \
  --source-group sg-0e4653fcd9cdf0ace

aws ec2 authorize-security-group-ingress \
  --group-id sg-07539c8a901e950a5 --protocol tcp --port 9098 \
  --source-group sg-0e4653fcd9cdf0ace
```

**Result:** `sg-07539c8a901e950a5`
**Why port 9098 too?** MSK Serverless mandates TLS — it does not expose a plaintext 9092 endpoint. Port 9098 is the IAM/TLS bootstrap port for MSK Serverless.

---

### Step 2 — RDS Postgres (`db.t4g.micro`)

**Why RDS over self-managed Postgres in a container?**
Running Postgres in an ECS container requires a persistent EFS volume, snapshot management, and manual failover. RDS handles automated backups, minor version patching, and point-in-time recovery out of the box — for zero extra cost on `t4g.micro` in the first 12 months (Free Tier).

**Why `db.t4g.micro`?** It's the smallest ARM-based instance class — cheapest option, Free Tier eligible. For a demo with <5 concurrent users it has more than enough IOPS.

**Why single-AZ?** Multi-AZ doubles the cost. A university demo doesn't need 99.95% uptime SLA.

**Why `20 GB`?** Minimum supported allocation. We won't come close to filling it.

**Why `--no-multi-az --publicly-accessible false`?** Keep the DB private. Only ECS tasks in the same VPC reach it through the RDS SG.

**Why a DB subnet group first?** RDS requires a subnet group that spans at least 2 AZs even for single-AZ deployments — this is an AWS requirement, not optional. We span all 3 for maximum placement flexibility.

**Why `scmadmin` not `admin`?** RDS reserves `admin` as a Postgres superuser keyword — the API rejects it. `scmadmin` is equally privileged without the naming conflict.

**Why password `@` replaced with `A`?** RDS disallows `/`, `@`, `"`, and space in master passwords (they break JDBC connection string parsing). The `@` was substituted with `A`.

```bash
# Subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name scm-rds-subnet-group \
  --db-subnet-group-description "SCM platform RDS subnet group - all 3 AZs" \
  --subnet-ids subnet-05ee7d681585b170e subnet-097acae75ef1765c2 subnet-0ea83e90d06e76d67

# Instance
aws rds create-db-instance \
  --db-instance-identifier scm \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username scmadmin \
  --master-user-password 'Vq9!rT#6mL2AxP8zK7wD' \
  --allocated-storage 20 \
  --db-subnet-group-name scm-rds-subnet-group \
  --vpc-security-group-ids sg-017c60d16c294890e \
  --no-multi-az \
  --no-publicly-accessible \
  --backup-retention-period 1 \
  --no-deletion-protection
```

**Status at creation:** `creating` (~5 minutes to become `available`)
**Endpoint:** (filled in when available)

---

### Step 3 — Database initialisation

After RDS is `available`, connect once via a bastion or temporary public access and run:

```sql
CREATE DATABASE logistics_db;    -- auth-service + inventory-service
CREATE DATABASE cart_db;         -- cart-service
CREATE DATABASE scm_order_db;    -- order-service
CREATE DATABASE scm_warehouse_db;-- warehouse-service
CREATE DATABASE scm_shipment_db; -- shipment-service
CREATE DATABASE scm_inventory_db;-- reserved / future
```

**Why so many databases?** Each microservice owns its schema — the core principle of database-per-service in microservice architecture. This prevents tight coupling: if `order-service` needs a schema migration it doesn't touch `shipment-service`'s tables.

**Why not separate RDS instances?** Cost. One `t4g.micro` with multiple databases is free. Six `t4g.micro` instances would exceed Free Tier immediately.

---

### Step 4 — Kafka on ECS Fargate (KRaft mode, self-managed)

**Why not MSK?**
MSK Serverless requires an account-level paid subscription upgrade — unavailable on the student/free-tier account in use. MSK provisioned requires a minimum of 2 brokers at ~$0.21/hr each (~$10/day). Neither is viable for a uni project.

**Why Kafka on ECS instead?**
Running Kafka as a Fargate task in the same ECS cluster is functionally identical to the local docker-compose setup. Services reach it via Service Connect DNS (`kafka:9092`) — the same hostname pattern used locally. No IAM auth changes needed in any Spring Boot service.

**Why KRaft mode (no ZooKeeper)?**
KRaft (Kafka Raft metadata) was introduced in Kafka 3.3 and removes the ZooKeeper dependency. One less container, simpler config, and it's the direction Kafka is moving. The `bitnami/kafka:3.7` image supports KRaft out of the box.

**Persistence note:** Fargate has no persistent disk. Kafka topics and offsets are lost on container restart. For a demo this is fine — services reconnect and resume publishing on restart.

**Image:** `bitnami/kafka:3.7`
**Port:** 9092 (PLAINTEXT — internal to VPC, no TLS needed)
**Service Connect name:** `kafka` → reachable as `kafka:9092` from all other ECS tasks
**Bootstrap servers env var in all services:** `SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092`

> This service is added to the ECS task definitions in Step 11 alongside all other services.

---

### Step 5 — ECR Repositories

**Why ECR over Docker Hub?**
ECR is in the same AWS network as ECS — image pulls are fast, free within the region, and don't count against Docker Hub rate limits. ECS task execution role has native ECR pull permissions without extra credentials.

**Why one repo per service?** ECR repos are namespaced by image; one repo per service means independent versioning and lifecycle policies (e.g., keep last 3 tags, expire untagged images after 7 days).

```bash
for svc in api-gateway auth-service cart-service inventory-service order-service \
           shipment-service warehouse-service notification-service \
           document-gen-service discovery-server dashboard; do
  aws ecr create-repository \
    --repository-name "scm/$svc" \
    --image-scanning-configuration scanOnPush=true
done
```

**Why `scanOnPush=true`?** ECR's built-in vulnerability scanner (powered by Amazon Inspector) runs on every push for free on the basic tier. It flags known CVEs in OS packages inside the image — useful to know about even for a uni project.

Repositories created (all under `310133718291.dkr.ecr.eu-north-1.amazonaws.com`):

| Service | ECR URI |
|---|---|
| `api-gateway` | `.../scm/api-gateway` |
| `auth-service` | `.../scm/auth-service` |
| `cart-service` | `.../scm/cart-service` |
| `inventory-service` | `.../scm/inventory-service` |
| `order-service` | `.../scm/order-service` |
| `shipment-service` | `.../scm/shipment-service` |
| `warehouse-service` | `.../scm/warehouse-service` |
| `notification-service` | `.../scm/notification-service` |
| `document-gen-service` | `.../scm/document-gen-service` |
| `discovery-server` | `.../scm/discovery-server` |
| `dashboard` | `.../scm/dashboard` |

---

### Step 6 — Build & Push Docker images

**Why build locally and push to ECR?** We don't have a CI/CD pipeline yet. Local build + push is the manual equivalent of what GitHub Actions would do. The images end up in ECR either way.

**Why `--platform linux/amd64`?** ECS Fargate in `eu-north-1` runs on x86_64 (amd64) hardware. If built on an ARM Mac the image would be `arm64` and crash on Fargate with an exec format error.

```
# Commands run per service
```

---

### Step 7 — IAM Roles

#### 7a — ECS Task Execution Role

**Why needed?** Fargate needs permission to pull images from ECR and write logs to CloudWatch. The execution role is assumed by the ECS agent (not the container itself) during startup.

```bash
aws iam create-role \
  --role-name scm-ecs-execution-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name scm-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Also allow execution role to inject secrets via valueFrom in task definitions
aws iam put-role-policy \
  --role-name scm-ecs-execution-role \
  --policy-name scm-secrets-read \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["secretsmanager:GetSecretValue","secretsmanager:DescribeSecret"],"Resource":"arn:aws:secretsmanager:eu-north-1:310133718291:secret:scm/platform*"}]}'
```

**Result ARN:** `arn:aws:iam::310133718291:role/scm-ecs-execution-role`

**Policies attached:**
- `AmazonECSTaskExecutionRolePolicy` — managed policy covering ECR pull + CloudWatch Logs write
- Inline `scm-secrets-read` — allows `secretsmanager:GetSecretValue` on `scm/platform*` so ECS can inject secret values into containers at boot via `valueFrom`

#### 7b — ECS Task Role

**Why separate from execution role?** The execution role is for ECS infrastructure. The task role is for application code at runtime. Keeping them separate follows least-privilege: if a service only needs SES, it gets only SES.

```bash
aws iam create-role \
  --role-name scm-ecs-task-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name scm-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

aws iam put-role-policy \
  --role-name scm-ecs-task-role \
  --policy-name scm-secrets-read \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["secretsmanager:GetSecretValue","secretsmanager:DescribeSecret"],"Resource":"arn:aws:secretsmanager:eu-north-1:310133718291:secret:scm/platform*"}]}'
```

**Result ARN:** `arn:aws:iam::310133718291:role/scm-ecs-task-role`

**Policies attached:**
- `AmazonSESFullAccess` — notification-service sends emails via SES SMTP
- Inline `scm-secrets-read` — application code can call Secrets Manager at runtime if needed

---

### Step 8 — Secrets Manager

**Why Secrets Manager over plain env vars in task definitions?**
Task definition env vars are visible in plaintext in the AWS console and in CloudTrail logs. Secrets Manager encrypts at rest with KMS, supports rotation, and integrates with ECS `valueFrom` so the secret is injected at container start and never stored in the task definition JSON.

**Why one secret?** For simplicity — one JSON blob with all sensitive values. In production you'd split by service so each service only reads its own secret.

Secret path: `scm/platform`

```bash
aws secretsmanager create-secret \
  --name scm/platform \
  --description "SCM platform sensitive credentials" \
  --secret-string '{
    "DB_PASSWORD":  "Vq9!rT#6mL2AxP8zK7wD",
    "DB_USERNAME":  "scmadmin",
    "JWT_SECRET":   "logisticsSecretKeyForJwtMustBeLongEnough123456789",
    "SES_USERNAME": "Adhams.Botmail@gmail.com",
    "SES_PASSWORD": "tkfp vsuh kybi jwbh",
    "RDS_HOST":     "scm.cxas028cs2m1.eu-north-1.rds.amazonaws.com"
  }'
```

**Result ARN:** `arn:aws:secretsmanager:eu-north-1:310133718291:secret:scm/platform-wyIu28`

Keys stored:
| Key | Used by |
|---|---|
| `DB_PASSWORD` | All Spring Boot services via JDBC |
| `DB_USERNAME` | All Spring Boot services via JDBC |
| `JWT_SECRET` | `auth-service`, `api-gateway` |
| `SES_USERNAME` | `notification-service` (SMTP login) |
| `SES_PASSWORD` | `notification-service` (SMTP password) |
| `RDS_HOST` | All Spring Boot services |

---

### Step 9 — CloudWatch Log Groups

**Why CloudWatch?** Fargate containers have no persistent disk — stdout/stderr would be lost on container restart. CloudWatch Logs gives a 30-day retention window (configurable), searchable log streams per container, and integrates with CloudWatch Alarms.

**Why one log group per service?** Separate retention policies, separate IAM access, easier grepping.

**Why 30-day retention?** Default is "never expire" which costs indefinitely. 30 days is enough to debug any issue after a demo. Adjust with `put-retention-policy` if needed.

```bash
for svc in api-gateway auth-service cart-service inventory-service order-service \
           shipment-service warehouse-service notification-service \
           document-gen-service discovery-server dashboard kafka; do
  aws logs create-log-group --log-group-name "/ecs/scm/$svc"
  aws logs put-retention-policy --log-group-name "/ecs/scm/$svc" --retention-in-days 30
done
```

Log groups created (all under `/ecs/scm/`): `api-gateway`, `auth-service`, `cart-service`, `inventory-service`, `order-service`, `shipment-service`, `warehouse-service`, `notification-service`, `document-gen-service`, `discovery-server`, `dashboard`, `kafka`

---

### Step 10 — ECS Cluster

**Why a single cluster for all services?**
ECS clusters are just logical groupings — they share no compute in Fargate (each task gets its own VM). One cluster keeps the console view simple and allows a single Service Connect namespace to span all services.

**Why Fargate and not EC2 launch type?**
EC2 launch type requires managing EC2 instances — patching, scaling the instance fleet, paying for idle capacity. Fargate is serverless: you pay per task-second, tasks scale to zero, no EC2 management.

**Service Connect namespace:** `scm.local`
Services call each other via `http://order-service:2501` — ECS Service Connect resolves the short name within the namespace. No Eureka needed.

**Why `containerInsights=enabled`?** Container Insights pushes CPU, memory, and network metrics per task to CloudWatch — useful for spotting a memory leak or a runaway service during a demo without needing Prometheus/Grafana.

**Why `FARGATE_SPOT` as a capacity provider?** Spot tasks run on spare AWS capacity at up to 70% discount. For background workers (notification-service, document-gen-service) that can tolerate interruption, Spot saves money. Gateway and auth-service use on-demand FARGATE (weight=1 default).

```bash
aws ecs create-cluster \
  --cluster-name scm-cluster \
  --settings name=containerInsights,value=enabled \
  --service-connect-defaults namespace=scm.local

aws ecs put-cluster-capacity-providers \
  --cluster scm-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

**Result:** `scm-cluster` — ACTIVE

---

### Step 11 — ECS Task Definitions

One task definition per service. Generated via Python (not bash heredoc) to avoid zsh `:r` modifier expanding `$VAR:role` incorrectly.

Key design decisions per task def:

| Field | Choice | Why |
|---|---|---|
| `networkMode` | `awsvpc` | Each task gets its own ENI + private IP; required for Service Connect |
| `cpu` / `memory` | 512/1024 Java, 256/512 Node+nginx | Java JVM needs ~512 MB minimum headroom |
| Env vars | non-sensitive inline | Hostname, port, service URLs — not secret |
| Secrets | `valueFrom` → Secrets Manager | DB password, JWT secret, email credentials — never in plaintext |
| `logConfiguration` | `awslogs` → `/ecs/scm/<name>` | CloudWatch log group per service, 30-day retention |
| Kafka bootstrap | `kafka:9092` | Service Connect DNS resolves `kafka` within `scm.local` namespace |
| `EUREKA_CLIENT_ENABLED` | `false` | Disabled — ECS Service Connect replaces Eureka |

**Why Python not bash for JSON generation?**
Zsh parameter expansion modifiers (`:r`, `:e`, `:h`) activate when `$VAR:something` appears in a string. `$ACCOUNT:role` → `$ACCOUNT` with `:r` modifier applied → strips "extension" → produces `310133718291ole/` instead of `310133718291:role/`. Python string interpolation has no such gotcha.

Task definitions registered (all at revision 1):
`kafka`, `discovery-server`, `api-gateway`, `auth-service`, `cart-service`, `inventory-service`, `order-service`, `shipment-service`, `warehouse-service`, `notification-service`, `document-gen-service`, `dashboard`

---

### Step 12 — Database Initialisation (one-off Fargate task)

RDS is private (not publicly accessible). To create the 6 databases, a one-off `postgres:15` Fargate task ran `psql` commands against the RDS endpoint from inside the VPC.

**Why a Fargate task instead of a bastion EC2?** No EC2 to provision, pay for, or clean up. The task runs, exits with code 0, and disappears. Pure serverless.

```bash
# Task definition: db-init (postgres:15 image, runs psql -c CREATE DATABASE x6)
aws ecs run-task \
  --cluster scm-cluster --task-definition db-init:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[scm-ecs-sg],assignPublicIp=ENABLED}"
```

**Exit code:** 0 — all 6 databases created:
`logistics_db`, `cart_db`, `scm_order_db`, `scm_warehouse_db`, `scm_shipment_db`, `scm_inventory_db`

---

### Step 13 — Application Load Balancer

**Why ALB and not NLB?**
ALB operates at Layer 7 (HTTP/HTTPS) and supports path-based routing — we route `/api/*` to `api-gateway` and `/*` to `dashboard` on a single ALB. NLB is Layer 4 (TCP) and can't do path routing.

**Why one ALB?** Cost. Each ALB costs ~$0.025/hr. Two ALBs = twice the cost for the same functionality.

```bash
aws elbv2 create-load-balancer --name scm-alb \
  --subnets subnet-05ee7d681585b170e subnet-097acae75ef1765c2 subnet-0ea83e90d06e76d67 \
  --security-groups sg-0669c4f560f2599b7 \
  --scheme internet-facing --type application

aws elbv2 create-target-group --name scm-tg-dashboard \
  --protocol HTTP --port 80 --vpc-id vpc-034e3644d0eb4001f \
  --target-type ip --health-check-path "/"

aws elbv2 create-target-group --name scm-tg-api-gateway \
  --protocol HTTP --port 7080 --vpc-id vpc-034e3644d0eb4001f \
  --target-type ip --health-check-path "/actuator/health"

# Listener: default → dashboard, priority-10 rule: /api/* → api-gateway
aws elbv2 create-listener --load-balancer-arn <ALB_ARN> \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<TG_DASHBOARD_ARN>

aws elbv2 create-rule --listener-arn <LISTENER_ARN> --priority 10 \
  --conditions '[{"Field":"path-pattern","Values":["/api/*"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"<TG_GATEWAY_ARN>"}]'
```

**ALB DNS:** `scm-alb-956459181.eu-north-1.elb.amazonaws.com`
**ALB ARN:** `arn:aws:elasticloadbalancing:eu-north-1:310133718291:loadbalancer/app/scm-alb/526e1a66ad5516bc`
**dashboard TG ARN:** `arn:aws:elasticloadbalancing:eu-north-1:310133718291:targetgroup/scm-tg-dashboard/51a7e43ba512f752`
**api-gateway TG ARN:** `arn:aws:elasticloadbalancing:eu-north-1:310133718291:targetgroup/scm-tg-api-gateway/2917d6610cf615a6`

---

### Step 14 — ECS Services

One ECS service per task definition.

- **Desired count:** 1
- **Launch type:** FARGATE
- **Subnets:** all 3 AZs
- **Security group:** `scm-ecs-sg` (`sg-0e4653fcd9cdf0ace`)
- **Service Connect:** enabled, namespace `scm.local`
- **`assignPublicIp=ENABLED`** — required for Fargate in public subnets to pull images from ECR without a NAT gateway

**Why not expose each service directly?** Only `api-gateway` and `dashboard` are user-facing. Backend services communicate over Service Connect (private DNS) — they never need internet exposure.

**Load balancer attachment:**
- `api-gateway` → `scm-tg-api-gateway`
- `dashboard` → `scm-tg-dashboard`

Services deployed and status at creation:

| Service | Running | Notes |
|---|---|---|
| kafka | 0→1 (image pull in progress) | bitnami/kafka:3.7 public image pull |
| discovery-server | 1 | portName=eureka (not http) |
| api-gateway | 1 | ALB attached |
| auth-service | 1 | |
| cart-service | 1 | |
| inventory-service | 1 | |
| order-service | 1 | |
| shipment-service | 1 | |
| warehouse-service | 1 | |
| notification-service | 1 | |
| document-gen-service | 1 | |
| dashboard | 1 | ALB attached |

---

### Step 15 — Verify & smoke test

```bash
# Check all services RUNNING
aws ecs describe-services --cluster scm-cluster \
  --services kafka api-gateway dashboard \
  --query "services[*].{name:serviceName,running:runningCount}"

# Hit the ALB
curl http://scm-alb-956459181.eu-north-1.elb.amazonaws.com/
curl http://scm-alb-956459181.eu-north-1.elb.amazonaws.com/api/actuator/health
```

---

## Updating a service (redeploy with new code)

Every time you change code in a service and want it live on ECS, follow these steps.
The process is: **build → tag → push → force redeploy**. ECS pulls the new image and replaces the running task with zero downtime (rolling update).

---

### Step 1 — Authenticate Docker to ECR

Your ECR login token expires every 12 hours. Always run this first.

```bash
aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com
```

**Why this command?** ECR doesn't use a static password — it issues a temporary token via STS. The `get-login-password` call fetches that token and pipes it directly into `docker login`. After this, Docker treats ECR like any private registry for the next 12 hours.

---

### Step 2 — Build the updated image

Run from the repo root. Replace `<service>` with the service you changed.

**Backend service (Java/Spring Boot):**
```bash
docker build --platform linux/amd64 \
  -t scm/<service> \
  ./backend/<service>

# Example — you changed order-service:
docker build --platform linux/amd64 \
  -t scm/order-service \
  ./backend/order-service
```

**Frontend (dashboard):**
```bash
docker build --platform linux/amd64 \
  -t scm/dashboard \
  -f ./frontend/Dockerfile \
  .
```

**Why `--platform linux/amd64`?** ECS Fargate in `eu-north-1` is x86_64. Building on an ARM machine (M1/M2 Mac) without this flag produces an `arm64` image that crashes on Fargate with `exec format error`.

**Why build from the repo root?** Some Dockerfiles (especially `dashboard`) need context from outside their own directory — e.g., the frontend Dockerfile needs access to the whole monorepo. Building from `.` satisfies that.

---

### Step 3 — Tag the image for ECR

```bash
docker tag scm/<service> \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/<service>:latest

# Example:
docker tag scm/order-service \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/order-service:latest
```

**Why tag separately?** `docker build -t` sets a local name. ECR requires the full registry hostname in the image name before it accepts a push. Tagging renames the image without rebuilding it.

**Why `:latest`?** The ECS task definitions reference `:latest`. Pushing to `:latest` means ECS picks up the new image automatically on the next deploy — no task definition update needed. If you want versioned rollbacks, push to a version tag (e.g., `:v1.2`) and update the task definition to point at it.

---

### Step 4 — Push to ECR

```bash
docker push \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/<service>:latest

# Example:
docker push \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/order-service:latest
```

**Why push before telling ECS to redeploy?** ECS pulls the image from ECR at deploy time — if you trigger the redeploy before the push finishes, the running task simply restarts with the old image. Always push first.

---

### Step 5 — Force ECS to redeploy

```bash
aws ecs update-service \
  --cluster scm-cluster \
  --service <service> \
  --force-new-deployment

# Example:
aws ecs update-service \
  --cluster scm-cluster \
  --service order-service \
  --force-new-deployment
```

**Why `--force-new-deployment`?** The task definition hasn't changed (still revision 1, still points at `:latest`). Without this flag, ECS sees no change in the task definition and does nothing. `--force-new-deployment` tells ECS to stop the current task and start a new one regardless, which pulls the freshly pushed `:latest` image.

**What happens during the redeploy?**
1. ECS starts a new task with the new image in parallel with the old one
2. The new task registers with the ALB target group (for `api-gateway` / `dashboard`)
3. Once the new task passes health checks, ECS drains and stops the old task
4. Total downtime: 0 (rolling update). The whole process takes ~60–120 seconds.

---

### Step 6 — Confirm the new task is running

```bash
aws ecs describe-services \
  --cluster scm-cluster \
  --services <service> \
  --query "services[0].{running:runningCount,pending:pendingCount,deployments:deployments[*].{status:status,desired:desiredCount,running:runningCount}}" \
  --output json

# Example:
aws ecs describe-services \
  --cluster scm-cluster \
  --services order-service \
  --query "services[0].{running:runningCount,pending:pendingCount,deployments:deployments[*].{status:status,desired:desiredCount,running:runningCount}}" \
  --output json
```

You want to see `"running": 1` and only one deployment with status `"PRIMARY"`. If you see two deployments (PRIMARY + ACTIVE), the rolling update is still in progress — wait 30 seconds and re-run.

---

### Updating multiple services at once

If a change touches several services (e.g., a shared library change), build and push all of them first, then force-redeploy all at once:

```bash
# 1. Build + push all changed services
ACCOUNT=310133718291.dkr.ecr.eu-north-1.amazonaws.com

for svc in order-service warehouse-service; do
  docker build --platform linux/amd64 -t scm/$svc ./backend/$svc
  docker tag scm/$svc $ACCOUNT/scm/$svc:latest
  docker push $ACCOUNT/scm/$svc:latest
done

# 2. Force redeploy all at once
for svc in order-service warehouse-service; do
  aws ecs update-service \
    --cluster scm-cluster \
    --service $svc \
    --force-new-deployment \
    --query "service.{name:serviceName,status:status}" \
    --output json
done
```

**Why push all before redeploying any?** If service A calls service B, and you redeploy A before B's new image is pushed, you briefly have a new A talking to an old B. Pushing everything first, then redeploying everything, keeps versions consistent.

---

### Quick reference — one-liner per service

```bash
# Set your target service
SVC=order-service   # change this

# Full update pipeline in one block
aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com && \
docker build --platform linux/amd64 -t scm/$SVC ./backend/$SVC && \
docker tag scm/$SVC 310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/$SVC:latest && \
docker push 310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/$SVC:latest && \
aws ecs update-service --cluster scm-cluster --service $SVC --force-new-deployment \
  --query "service.deployments[0].{status:status,desired:desiredCount}" --output json
```

For the **dashboard** (different build context):
```bash
SVC=dashboard

aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin \
  310133718291.dkr.ecr.eu-north-1.amazonaws.com && \
docker build --platform linux/amd64 -t scm/$SVC -f ./frontend/Dockerfile . && \
docker tag scm/$SVC 310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/$SVC:latest && \
docker push 310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/$SVC:latest && \
aws ecs update-service --cluster scm-cluster --service $SVC --force-new-deployment \
  --query "service.deployments[0].{status:status,desired:desiredCount}" --output json
```

---

## Autoscaling

Three worker services — `order-service`, `shipment-service`, `notification-service` — have Application Auto Scaling configured with two independent policies each.

### Why these three services?

These are the Kafka consumer workers. When order volume spikes, Kafka messages accumulate faster than one task can process them — CPU rises and consumer lag grows. Scaling these services horizontally reduces lag and keeps order→shipment→notification latency low. The gateway, auth, and warehouse services handle synchronous HTTP requests and benefit less from task-level horizontal scaling.

### Policies per service

| Service | Policy | Trigger | Scale-out | Scale-in |
|---|---|---|---|---|
| `order-service` | CPU target | CPU > 60% | +tasks after 60s cooldown | -tasks after 180s |
| `order-service` | Kafka lag | `ConsumerLag` > 200 msgs | +tasks after 30s cooldown | -tasks after 180s |
| `shipment-service` | CPU target | CPU > 60% | +tasks after 60s | -tasks after 180s |
| `shipment-service` | Kafka lag | `ConsumerLag` > 100 msgs | +tasks after 30s | -tasks after 180s |
| `notification-service` | CPU target | CPU > 55% | +tasks after 60s | -tasks after 180s |
| `notification-service` | Kafka lag | `ConsumerLag` > 150 msgs | +tasks after 30s | -tasks after 180s |

All services: **min 1 task, max 10 tasks**.

### Why shorter scale-out cooldown for Kafka lag (30s vs 60s)?

CPU is a lagging indicator — it rises *after* tasks are already saturated. Consumer lag is a leading indicator — it rises *before* CPU does, as messages queue up. Reacting faster to lag (30s) prevents a backlog from building. Scale-in is intentionally slow (180s) for both policies to avoid thrashing.

### Why target tracking instead of step scaling?

Target tracking automatically calculates how many tasks to add/remove to reach the target value. You don't have to hand-tune step thresholds. AWS Application Auto Scaling handles the math.

### The Kafka lag metric (`SCM/Workers:ConsumerLag`)

This is a **custom CloudWatch metric** in the namespace `SCM/Workers`. It must be published by something that reads Kafka consumer group offsets and pushes the lag value. Options:

1. **A Spring Boot actuator metric + CloudWatch agent** — expose consumer lag via Micrometer and push to CloudWatch
2. **A Kafka exporter sidecar** — run `kafka-consumer-groups.sh` periodically and `aws cloudwatch put-metric-data`
3. **CloudWatch Container Insights + Kafka plugin** — not natively supported for self-managed Kafka

Until the metric is published, the Kafka lag policies exist but never trigger (no data = no alarm). The CPU policies are fully active and will scale immediately on load.

### Commands run

```bash
# Register scalable targets
for svc in order-service shipment-service notification-service; do
  aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id "service/scm-cluster/${svc}" \
    --min-capacity 1 --max-capacity 10
done

# CPU policies (predefined ECS metric — works immediately)
aws application-autoscaling put-scaling-policy \
  --policy-name order-service-cpu-target \
  --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/scm-cluster/order-service \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageCPUUtilization"},
    "ScaleOutCooldown": 60, "ScaleInCooldown": 180
  }'
# (repeat for shipment @ 60%, notification @ 55%)

# Kafka lag policies (custom metric — activates once publisher is running)
aws application-autoscaling put-scaling-policy \
  --policy-name order-service-kafka-lag-target \
  --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/scm-cluster/order-service \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 200.0,
    "CustomizedMetricSpecification": {
      "Namespace": "SCM/Workers", "MetricName": "ConsumerLag",
      "Statistic": "Average",
      "Dimensions": [{"Name": "ServiceName", "Value": "order-service"}]
    },
    "ScaleOutCooldown": 30, "ScaleInCooldown": 180
  }'
# (repeat for shipment @ 100, notification @ 150)
```

---

## CloudWatch Dashboard (`SCM-Platform`)

**Direct link:** `https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#dashboards:name=SCM-Platform`

Created via `aws cloudwatch put-dashboard --dashboard-name SCM-Platform`.

### What's on the dashboard

| Section | Metrics shown |
|---|---|
| **ALB Traffic** | Request count (total / per target group), p50 + p99 response time, 4xx + 5xx error counts |
| **RDS Postgres** | CPU %, active connections, read/write IOPS, free storage GB |
| **Autoscaling Workers** | CPU utilization + running task count for order, shipment, notification |
| **Kafka Consumer Lag** | `SCM/Workers:ConsumerLag` per service with horizontal annotations at scale-out thresholds; running task count overlay |
| **All ECS Services** | CPU + memory utilization for all 11 services |

### Why CloudWatch over Grafana/Prometheus?

On ECS Fargate there is no persistent disk and no host-level agent. Prometheus scraping requires a sidecar or a push-gateway, and Grafana needs persistent storage (EFS). CloudWatch Container Insights is built into ECS — enabling it (done at cluster creation with `containerInsights=enabled`) automatically publishes CPU, memory, and task count metrics for every Fargate service with zero configuration. For a demo, it's the path of least resistance and the TA can view it directly in the AWS console with their credentials.

### Re-creating the dashboard (if deleted)

The dashboard JSON is generated by `python3` and pushed via:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name SCM-Platform \
  --dashboard-body file:///tmp/scm-dashboard.json
```

To regenerate, re-run the Python script in this session history or rebuild from the widget definitions above.

---

## HTTPS / TLS — ACM Certificate + ALB HTTPS Listener

### Why ACM over Let's Encrypt?

| | ACM | Let's Encrypt |
|---|---|---|
| Cost | Free | Free |
| Renewal | Automatic (AWS manages it) | Manual or cron job (certbot) |
| ALB integration | Native — attach ARN to listener | Must upload cert to IAM/ACM manually every 90 days |
| Setup complexity | Request + DNS CNAME | Certbot server, renewal automation, storage |

ACM certificates attached to an ALB never expire from your perspective — AWS renews them automatically before expiry with no action needed.

### Certificate details

- **Domain:** `scm.maayn.com`
- **Validation method:** DNS (one CNAME record in Cloudflare, proxy OFF)
- **ARN:** `arn:aws:acm:eu-north-1:310133718291:certificate/4eb1b17a-5b05-4bc9-bef8-ede4f61d3663`
- **Status:** ISSUED ✅

### Validation CNAME added to Cloudflare

```
Type:  CNAME
Name:  _bd0709427c6585a5a70a383a24fd18d8.scm
Value: _84e90d73eaf57ffc963a8d48f59a6a5b.jkddzztszm.acm-validations.aws.
Proxy: OFF (DNS-only — ACM must see the raw DNS value, not Cloudflare's IP)
```

### ALB listener configuration after cert

```bash
# Create HTTPS listener — cert attached, TLS 1.3 policy, default → dashboard
aws acm request-certificate \
  --domain-name scm.maayn.com --validation-method DNS

aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<CERT_ARN> \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=<TG_DASHBOARD>

# Add /api/* rule to HTTPS listener (mirrors the HTTP listener)
aws elbv2 create-rule \
  --listener-arn <HTTPS_LISTENER_ARN> --priority 10 \
  --conditions '[{"Field":"path-pattern","Values":["/api/*"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"<TG_GATEWAY>"}]'

# Redirect all HTTP → HTTPS permanently (301)
aws elbv2 modify-listener \
  --listener-arn <HTTP_LISTENER_ARN> \
  --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]'
```

**Why `ELBSecurityPolicy-TLS13-1-2-2021-06`?** This policy enforces TLS 1.2 minimum and enables TLS 1.3. It drops older cipher suites (RC4, 3DES) that have known weaknesses. The most secure AWS-managed policy that still works with all modern browsers.

### Final ALB listener state

| Port | Protocol | Action |
|---|---|---|
| 80 | HTTP | Redirect → HTTPS 301 |
| 443 | HTTPS | Forward → dashboard (default) / api-gateway (/api/*) |

### Cloudflare SSL/TLS mode update

After attaching the ACM cert, change Cloudflare SSL/TLS mode from **Flexible → Full**:

- **Flexible** (old): Cloudflare → ALB over plain HTTP. Used when ALB had no cert.
- **Full** (now): Cloudflare → ALB over HTTPS. Correct now that ALB has a valid ACM cert.
- You can also re-enable **HTTP/3 (QUIC)** in Cloudflare → Network — now the full TLS chain is valid, QUIC works correctly.

### CORS fix (api-gateway)

The gateway was using `CorsFilter` (servlet) in a WebFlux (reactive) application. Servlet filters are silently ignored in WebFlux — no `Access-Control-Allow-Origin` headers were ever sent, so every browser preflight failed.

**Fix:** replaced with `CorsWebFilter` from `org.springframework.web.cors.reactive`:

```java
// WRONG — servlet filter, ignored silently in WebFlux
import org.springframework.web.filter.CorsFilter;

// CORRECT — reactive WebFilter, works with Spring Cloud Gateway
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
```

Rebuild and push `api-gateway` after this change.

---

## Custom domain via Cloudflare (`scm.maayn.com`)

### Why a custom domain?

The ALB gives you a raw HTTP URL (`http://scm-alb-956459181...`). Without a domain:
- The browser serves the dashboard over HTTP (no SSL)
- Chrome's **Private Network Access** policy blocks any HTTP page from calling `localhost` — even accidentally
- There's no way to get HTTPS without a certificate

Cloudflare solves all three problems in two minutes with zero cost: it provides SSL termination at the edge, gives a clean URL, and since both the page and the API are on `scm.maayn.com`, they share the same origin — **CORS doesn't apply at all**.

---

### Step 1 — Add the DNS record in Cloudflare

In the Cloudflare dashboard for `maayn.com` → **DNS** → **Add record**:

| Type | Name | Target | Proxy status |
|---|---|---|---|
| `CNAME` | `scm` | `scm-alb-956459181.eu-north-1.elb.amazonaws.com` | **Proxied** (orange cloud ON) |

**Why CNAME and not A record?** The ALB has a DNS name, not a static IP. ALB IPs change when AWS scales the load balancer. A CNAME follows the DNS name; an A record would go stale.

**Why Proxied (orange cloud) ON?** This routes traffic through Cloudflare's edge network, which handles SSL termination. Without it, Cloudflare is just DNS and provides no HTTPS.

---

### Step 2 — Set Cloudflare SSL/TLS mode to Flexible

In Cloudflare dashboard → **SSL/TLS** → **Overview** → select **Flexible**.

| Mode | Browser → Cloudflare | Cloudflare → ALB | Works? |
|---|---|---|---|
| Off | HTTP | HTTP | No HTTPS for users |
| **Flexible** ✅ | **HTTPS** | **HTTP** | **Use this** |
| Full | HTTPS | HTTPS | ALB has no HTTPS listener → breaks |
| Full (Strict) | HTTPS | HTTPS + cert validation | ALB has no cert → breaks |

**Why Flexible?** Our ALB only has an HTTP listener on port 80 (no ACM certificate). Flexible mode means Cloudflare terminates SSL with the user's browser, then forwards to the ALB over plain HTTP inside Cloudflare's private network. The user gets HTTPS; our ALB stays simple.

> No reCAPTCHA, no bot challenge, no other settings to change. Only the SSL/TLS mode matters.

---

### Step 3 — How the URL gets injected at runtime (no rebuild needed)

This is the key part: changing `API_BASE_URL` in the ECS task definition takes effect **without rebuilding the Docker image**.

**How it works:**

```
docker build  →  index.html contains: window.__APP_CONFIG__ = { API_BASE_URL: "__API_BASE_URL__" }
                 (placeholder baked in at build time)
                 ↓
ECS starts container  →  docker-entrypoint.sh runs BEFORE nginx accepts requests
                         reads API_BASE_URL env var from the ECS task definition
                         writes /usr/share/nginx/html/config.js:
                           window.__APP_CONFIG__ = { "API_BASE_URL": "https://scm.maayn.com" };
                         ↓
Browser requests https://scm.maayn.com/
  → index.html loads
  → inline script: window.__APP_CONFIG__ = { API_BASE_URL: "__API_BASE_URL__" }  (local dev fallback)
  → <script src="/config.js"> runs: window.__APP_CONFIG__ = { API_BASE_URL: "https://scm.maayn.com" }
  → axiosInstance.ts reads window.__APP_CONFIG__.API_BASE_URL → "https://scm.maayn.com"
  → all API calls go to https://scm.maayn.com/api/...  (same origin, zero CORS)
```

**Why generate `config.js` instead of sed-patching the JS bundle?**
The old approach used `sed` to modify the built JS files on disk. If ECS restarted the container (without a new deployment), the placeholder was already gone — the new `API_BASE_URL` could never be picked up. Generating `config.js` fresh on every container start means the env var is always applied, even on a task restart.

---

### Step 4 — Changing the API URL in future (zero rebuild)

If you ever change the domain or need to point at a different backend:

```bash
# 1. Register a new task definition revision with the new URL
NEW_URL="https://new-domain.com"
CURRENT=$(aws ecs describe-task-definition --task-definition dashboard \
  --query 'taskDefinition' --output json | \
  python3 -c "
import sys, json
td = json.load(sys.stdin)
for k in ['taskDefinitionArn','revision','status','registeredAt','registeredBy','requiresAttributes','compatibilities']:
    td.pop(k, None)
for c in td['containerDefinitions']:
    for e in c.get('environment', []):
        if e['name'] == 'API_BASE_URL':
            e['value'] = '$NEW_URL'
print(json.dumps(td))
")

NEW_REV=$(aws ecs register-task-definition --cli-input-json "$CURRENT" \
  --query "taskDefinition.revision" --output text)
echo "Registered revision $NEW_REV"

# 2. Deploy it — no docker build, no docker push
aws ecs update-service \
  --cluster scm-cluster \
  --service dashboard \
  --task-definition "dashboard:${NEW_REV}" \
  --force-new-deployment \
  --query "service.deployments[0].{status:status,rollout:rolloutState}" \
  --output json
```

ECS stops the old container, starts a new one, `docker-entrypoint.sh` generates a fresh `config.js` with the new URL. Done in ~60 seconds. **No docker build. No docker push.**

---

### Current live URLs

| URL | What it serves |
|---|---|
| `https://scm.maayn.com/` | React dashboard (nginx) |
| `https://scm.maayn.com/api/` | API gateway (Spring Cloud Gateway) |

**Dashboard task definition:** `dashboard:2` — `API_BASE_URL=https://scm.maayn.com`

---

## Cost kill-switch (when you're done demoing)

```bash
# Scale all services to 0 (stops Fargate billing, keeps task defs/config intact)
for svc in kafka api-gateway auth-service cart-service inventory-service \
           order-service shipment-service warehouse-service \
           notification-service document-gen-service discovery-server dashboard; do
  aws ecs update-service --cluster scm-cluster --service $svc --desired-count 0
done

# Delete the ALB (saves ~$0.025/hr)
aws elbv2 delete-load-balancer \
  --load-balancer-arn arn:aws:elasticloadbalancing:eu-north-1:310133718291:loadbalancer/app/scm-alb/526e1a66ad5516bc

# RDS is Free Tier — leave it running (costs $0 for 12 months on t4g.micro)
# Kafka runs on Fargate — already at 0 cost once scaled to 0 above
```

---

## Teardown (full delete)

```bash
# 1. Scale ECS to 0 (see above)
# 2. Delete ECS services
# 3. Delete ECS cluster
# 4. Delete ALB + target groups
# 5. Delete MSK cluster
# 6. Delete RDS instance (--skip-final-snapshot for a demo)
# 7. Delete ECR repos
# 8. Delete Secrets Manager secret
# 9. Delete CloudWatch log groups
# 10. Delete IAM roles
# 11. Delete security groups
```

Full teardown commands are in [`infra/teardown.sh`](../infra/teardown.sh) (generated at end of deployment).

---

## Troubleshooting: ECS Service Connect + Eureka service discovery

### Symptom

`POST /api/auth/login` returns `{"status": 500, "error": "Internal Server Error"}` after deployment. The api-gateway logs show `No servers available for service: auth-service` from Spring Cloud LoadBalancer.

### Root cause

ECS Service Connect injects an Envoy proxy sidecar whose inbound listener is bound to `169.254.172.2` (a link-local address) inside every task's network namespace. Spring Cloud's `InetUtils.findFirstNonLoopbackAddress()` scans network interfaces on startup and picks up this address — it appears before the real VPC ENI address (`172.31.x.x`) in the enumeration order.

The result: every service registers in Eureka with `169.254.172.2` as its IP:

```
Registered instance AUTH-SERVICE/169.254.172.2:auth-service:8081 with status UP
```

When the api-gateway resolves `lb://auth-service`, it gets `169.254.172.2:8081`. That address is the SC proxy's inbound port for auth-service's own task — it is **not routable from other tasks**. The connection fails, LoadBalancer marks the instance unhealthy, and the gateway returns 500.

### What doesn't work

| Approach | Why it fails |
|---|---|
| `SPRING_CLOUD_INETUTILS_USE__ONLY__SITE__LOCAL__INTERFACES=true` | Double underscores map to literal `_` in the property key, not to the `-` in `use-only-site-local-interfaces` |
| `SPRING_CLOUD_INETUTILS_USE_ONLY_SITE_LOCAL_INTERFACES=true` | Spring Boot canonicalizes `USE_ONLY_SITE_LOCAL_INTERFACES` into 5 separate dot-segments, producing `spring.cloud.inetutils.use.only.site.local.interfaces` which doesn't match the 4-segment `use-only-site-local-interfaces` field |
| `EUREKA_INSTANCE_PREFER_IP_ADDRESS=false` alone | InetUtils still resolves the hostname to `169.254.172.2` for the instance ID; the registered host/IP is unchanged |

### Fix

Add two env vars to **every backend service ECS task definition**:

```
EUREKA_INSTANCE_PREFER_IP_ADDRESS=false
EUREKA_INSTANCE_HOSTNAME=<service-name>   # must match the ECS Service Connect discoveryName
```

Examples:
- `auth-service`: `EUREKA_INSTANCE_HOSTNAME=auth-service`
- `order-service`: `EUREKA_INSTANCE_HOSTNAME=order-service`
- `api-gateway`: `EUREKA_INSTANCE_HOSTNAME=api-gateway`
- (repeat for each service)

### Why this works

With these env vars, each service registers in Eureka with its **Service Connect DNS name** instead of the SC proxy IP. When the api-gateway resolves `lb://auth-service`, Spring Cloud LoadBalancer returns a service instance with `host=auth-service`. The gateway makes an HTTP call to `http://auth-service:8081/api/auth/...`. ECS Service Connect's DNS intercepts the lookup for `auth-service` and routes the TCP connection to a healthy auth-service task in the VPC.

This correctly delegates actual load balancing to ECS Service Connect (which was designed for this), while keeping Eureka purely for service registration metadata.

### Caveat

The Eureka instance ID will still contain `169.254.172.2` (it is computed from `spring.cloud.client.hostname` which uses InetUtils). This is harmless — the instance ID is only used for de-registration, not for connection routing.

### Task definition revisions when fix was applied

All backend services were on task definition `:7` (except `document-gen-service` which was `:6`) after this fix was applied on 2026-05-05.

---

## Troubleshooting: 403 Forbidden on `/api/dashboard/me` (and all protected routes after restart)

### Symptom

After any ECS service deployment, users who were previously logged in get `403 Forbidden` on all non-public endpoints even though their JWT is still valid.

### Root cause

`spring.jpa.hibernate.ddl-auto=create` was hardcoded in `auth-service/application.properties`. Every container restart (including normal ECS rolling deploys) drops and recreates all database tables. The JWT is cryptographically valid but the email it contains no longer exists in the database. Spring Security's `JwtFilter` sets `user = null` → Spring Security context stays anonymous → the `SecurityConfig` rule `.authenticated()` triggers a `403 Forbidden`.

The same `create` default (via `${SPRING_JPA_HIBERNATE_DDL_AUTO:create}`) was present in order-service, inventory-service, shipment-service, and warehouse-service, causing their data to be wiped on each deploy too.

### Fix

1. Changed `auth-service/application.properties` from hardcoded `create` to `${SPRING_JPA_HIBERNATE_DDL_AUTO:update}`, rebuilt image, pushed to ECR.
2. Added `SPRING_JPA_HIBERNATE_DDL_AUTO=update` env var to ECS task definitions for all affected services (order-service:9, inventory-service:9, shipment-service:9, warehouse-service:9).

With `ddl-auto=update`, Hibernate checks the schema on startup and only adds new columns/tables without ever dropping existing data.

### After this fix

- Existing user accounts survive ECS rolling deploys
- Users stay logged in across deployments
- Demo seed data (orders, inventory, warehouses) persists between restarts
- **One-time action required**: since the last `create` wiped all data, users need to re-register once. After that, no more data loss.

---

## Troubleshooting: Kafka container crash-loop (bitnami/kafka image not found)

### Symptom

Kafka ECS service has `running: 0 / desired: 1`. Service events show:
```
CannotPullContainerError: failed to resolve ref docker.io/bitnami/kafka:3.7: not found
```

Downstream effect: shipment-service returns 504 on write operations (Kafka producer blocks until timeout), notification-service consumers never receive events.

### Root cause

The `bitnami/kafka:3.7` tag (and `bitnami/kafka:latest`) no longer exists on Docker Hub. ECS Fargate tasks pull from Docker Hub on startup; with the image gone, the task can never start. There is no persistent volume, so every restart attempt is a fresh pull.

### Fix

1. Pulled `apache/kafka:3.7.0` from Docker Hub locally (official Apache image, available and maintained).
2. Created ECR repository `scm/kafka`.
3. Tagged and pushed to `310133718291.dkr.ecr.eu-north-1.amazonaws.com/scm/kafka:3.7.0`.
4. Updated Kafka task definition (rev 3) to use the ECR image.
5. Updated environment variables from Bitnami `KAFKA_CFG_*` prefix to official Apache `KAFKA_*` prefix:

| Bitnami env var | Apache env var |
|---|---|
| `KAFKA_CFG_NODE_ID=1` | `KAFKA_NODE_ID=1` |
| `KAFKA_CFG_PROCESS_ROLES=broker,controller` | `KAFKA_PROCESS_ROLES=broker,controller` |
| `KAFKA_CFG_LISTENERS=...` | `KAFKA_LISTENERS=...` |
| `KAFKA_CFG_ADVERTISED_LISTENERS=...` | `KAFKA_ADVERTISED_LISTENERS=...` |
| `KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=...` | `KAFKA_CONTROLLER_QUORUM_VOTERS=...` |
| `KAFKA_KRAFT_CLUSTER_ID=...` | `CLUSTER_ID=...` |

**Lesson**: Never use Docker Hub images directly in ECS task definitions. Mirror all third-party images to ECR on first use. ECR is always reachable from Fargate (via VPC endpoint or public IP); Docker Hub is subject to rate limits and tag removal.

---

## Troubleshooting: Notification service not receiving Kafka events

### Symptom

Notification service is running (ECS shows 1/1) but no emails are sent after orders are created. No Kafka log lines appear in the service logs.

### Root cause

Notification-service started when Kafka was down (crash-looping due to bad image tag). Spring Kafka consumers attempt to connect on startup and enter an exponential-backoff retry loop. After many failures over hours, retry intervals grow very long. The service never successfully subscribes to topics even after Kafka is restored.

### Fix

Force a new deployment: `aws ecs update-service --cluster scm-cluster --service notification-service --force-new-deployment`. The new task starts after Kafka is healthy and connects immediately.

**Prevention**: If Kafka restarts frequently, configure `spring.kafka.consumer.reconnect-backoff-ms=1000` and `spring.kafka.consumer.reconnect-backoff-max-ms=10000` so the retry window doesn't grow indefinitely.

---

## Troubleshooting: document-gen-service 500 on POST /api/documents/order-receipt

### Root cause

The NestJS `EurekaService` in document-gen-service had the same `169.254.172.2` Eureka registration bug as the Spring Boot services, but implemented differently. The `getIpAddress()` method in `src/eureka/eureka.service.ts` scanned `os.networkInterfaces()` and returned the first non-internal IPv4, which was the ECS SC proxy address. The gateway's `lb("document-gen-service")` got `169.254.172.2:3050` and the connection failed.

### Fix

1. Updated `EurekaService` constructor to read `EUREKA_INSTANCE_HOSTNAME` env var (falling back to `os.hostname()`).
2. Fixed `getIpAddress()` to skip `169.254.x.x` addresses.
3. Updated Eureka registration body to use `this.hostname` (SC DNS name) for `hostName` field.
4. Rebuilt image, pushed to ECR, force-redeployed.

---

## Performance tuning: JVM heap and CPU allocation

### Problem

Spring Boot services were allocated 512 CPU units (0.5 vCPU) and 1024 MB RAM. The JVM default heap left less than 300 MB for application code, causing frequent GC pauses and slow response times (first-request latencies > 5s, steady-state p99 > 2s).

### Fix

Applied to all Spring Boot services via task definition update (2026-05-05):

- Memory: `1024 MB → 2048 MB` for all Spring Boot services
- CPU: `512 (0.5 vCPU) → 1024 (1 vCPU)` for api-gateway only (critical request path)
- JVM flags: `JAVA_TOOL_OPTIONS=-Xmx1536m -Xms256m -XX:+UseG1GC`

The `JAVA_TOOL_OPTIONS` env var is read automatically by the JVM (Java 9+) without any Dockerfile change. G1GC improves pause-time predictability for web-service workloads.

---

## Load testing and autoscaling

### Test script

`scripts/loadtest.js` — pure Node.js, no dependencies, runs with `node scripts/loadtest.js`.

| Env var | Default | Notes |
|---|---|---|
| `BASE_URL` | `https://scm.maayn.com` | Target |
| `LT_EMAIL` | `admin@scm.local` | Must be an existing account |
| `LT_PASSWORD` | `Admin@12345` | Default bootstrap admin password |
| `CONCURRENCY` | `50` | Workers. ≥50 needed to saturate 0.5 vCPU |
| `DURATION_S` | `360` | 6 min. ECS needs ~3 min to detect and act |
| `RAMP_S` | `15` | Quick ramp to spike CPU fast |

Traffic mix: 80% `POST /api/orders`, 10% `GET /api/orders`, 5% `GET /api/shipments`, 5% `GET /api/inventory`.

### Autoscaling timeline

```
T+0s   — test starts; CPU climbs on order-service
T+60s  — CloudWatch publishes first 1-min ECSServiceAverageCPUUtilization datapoint
T+90s  — Application Auto Scaling detects breach of 60% target, fires scale-out
T+120s — ECS launches a new order-service Fargate task
T+170s — Spring Boot starts on new task (50-90s JVM startup)
T+210s — New task registers with Eureka, ALB marks it healthy
T+300s — With 2 tasks running, CPU per task drops; scale-in cooldown starts (180s)
T+480s — After sustained low CPU, scale-in fires (back to 1 task)
```

### Watch autoscaling live

```bash
watch -n 10 "aws ecs describe-services \
  --cluster scm-cluster \
  --services order-service shipment-service notification-service \
  --region eu-north-1 \
  --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}' \
  --output table"
```
