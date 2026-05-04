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
