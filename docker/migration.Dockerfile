FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends mdbtools postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.main.json ./
COPY scripts ./scripts
COPY src ./src
COPY migration-data/scripts ./migration-data/scripts
RUN npm run build:main
ENTRYPOINT ["node"]
CMD ["--version"]
