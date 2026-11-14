# NestJS API server. Build context: this server/ folder.

# Stage 1: install every dependency, compile TypeScript, then drop dev dependencies.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Stage 2: only the compiled code and production dependencies.
FROM node:24-bookworm-slim
# tzdata so TZ applies to logs and any local-time formatting; the SQL already
# uses America/Regina explicitly.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    TZ=America/Regina \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Run as the image's unprivileged "node" user, not root.
USER node
EXPOSE 3000
# Healthy only when the server answers /health, i.e. it can reach PostgreSQL.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
