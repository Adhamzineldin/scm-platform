#!/bin/sh
# Replace the placeholder baked in at build time with the real runtime URL.
# Lets the SAME image run locally (http://localhost:7080) AND on AWS
# (https://api.your-domain.com) just by changing API_BASE_URL.
set -eu
API_BASE_URL="${API_BASE_URL:-http://localhost:7080}"
echo "[entrypoint] Injecting API_BASE_URL=$API_BASE_URL"
find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.html" \) \
  -exec sed -i "s|__API_BASE_URL__|$API_BASE_URL|g" {} +

