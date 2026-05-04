#!/bin/sh
# Generates /config.js on every container start from the API_BASE_URL env var.
# This runs BEFORE nginx serves any requests, so the file is always fresh.
# Changing API_BASE_URL in the ECS task definition takes effect on the next
# container start — no image rebuild required.
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:7080}"
echo "[entrypoint] API_BASE_URL=${API_BASE_URL}"

cat > /usr/share/nginx/html/config.js <<JSEOF
window.__APP_CONFIG__ = { "API_BASE_URL": "${API_BASE_URL}" };
JSEOF
