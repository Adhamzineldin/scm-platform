# ───── Build stage ─────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build with a placeholder we replace at container start
ENV VITE_API_BASE_URL=__API_BASE_URL__
RUN npm run build

# ───── Runtime stage ─────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
# Strip any CRLF line endings that Windows checkouts may have introduced
# (without this, /bin/sh fails with "not found" because of the trailing \r in the shebang)
# and ensure the script is executable.
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-inject-env.sh \
    && chmod +x /docker-entrypoint.d/40-inject-env.sh
EXPOSE 80

