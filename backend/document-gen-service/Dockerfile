# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

# Pin pnpm to a version compatible with lockfileVersion 9 (avoid surprises from `latest`)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install all deps (including devDependencies) using the lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy source and build (node_modules is excluded via .dockerignore)
COPY . .
RUN pnpm build

# Drop devDependencies to slim runtime image
RUN pnpm prune --prod

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3050

CMD ["node", "dist/main"]
