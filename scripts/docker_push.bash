#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SERVICES=(
  api-gateway
  auth-service
  cart-service
  inventory-service
  order-service
  shipment-service
  warehouse-service
  notification-service
  document-gen-service
  discovery-server
)

ACCOUNT="310133718291.dkr.ecr.eu-north-1.amazonaws.com"

if [[ ! -f "$ROOT_DIR/frontend/Dockerfile" ]]; then
  echo "ERROR: frontend Dockerfile not found at $ROOT_DIR/frontend/Dockerfile"
  exit 1
fi

if [[ ! -f "$ROOT_DIR/packages/payment-gateway/package.json" ]]; then
  echo "ERROR: payment-gateway package.json not found under $ROOT_DIR/packages/payment-gateway"
  exit 1
fi

# 1. Build and push backend services
for svc in "${SERVICES[@]}"; do
  echo ">>> Processing backend service: $svc"
  if [[ ! -f "$ROOT_DIR/backend/$svc/Dockerfile" ]]; then
    echo "ERROR: Dockerfile missing for backend service '$svc' at $ROOT_DIR/backend/$svc/Dockerfile"
    exit 1
  fi

  docker build --platform linux/amd64 -t "scm/$svc" "$ROOT_DIR/backend/$svc"
  docker tag scm/$svc $ACCOUNT/scm/$svc:latest
  docker push $ACCOUNT/scm/$svc:latest
done

# 2. Build and push Dashboard (Dockerfile is in frontend/, context is repo root)
echo ">>> Processing frontend service: dashboard"
docker build --platform linux/amd64 -t scm/dashboard -f "$ROOT_DIR/frontend/Dockerfile" "$ROOT_DIR"
docker tag scm/dashboard $ACCOUNT/scm/dashboard:latest
docker push $ACCOUNT/scm/dashboard:latest

echo ">>> All images successfully built and pushed!"
