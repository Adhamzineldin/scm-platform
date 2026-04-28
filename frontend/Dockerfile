# ───── Build stage ─────
FROM node:20-alpine AS build

# Copy the payment-gateway package (pre-built dist, no npm install needed)
WORKDIR /app/packages/payment-gateway
COPY packages/payment-gateway/package.json ./
COPY packages/payment-gateway/dist ./dist

# Install and build the frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Build with a placeholder we replace at container start
ENV VITE_API_BASE_URL=__API_BASE_URL__
RUN npm run build

# ───── Runtime stage ─────
FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-inject-env.sh \
    && chmod +x /docker-entrypoint.d/40-inject-env.sh
EXPOSE 80

