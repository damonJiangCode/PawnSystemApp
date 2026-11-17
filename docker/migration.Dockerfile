# One-off Access-to-PostgreSQL import. Build context: the repository root.
# Only the database workspace is installed; the scripts are plain CommonJS.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends mdbtools postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY database/package.json ./database/package.json
RUN npm ci --workspace database --omit=dev --no-audit --no-fund
COPY database ./database
ENTRYPOINT ["node"]
CMD ["--version"]
