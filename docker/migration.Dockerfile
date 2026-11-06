FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends mdbtools postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY electron/tsconfig.json ./electron/tsconfig.json
COPY scripts ./scripts
COPY electron/src ./electron/src
COPY shared ./shared
COPY database ./database
RUN npm run build:main
ENTRYPOINT ["node"]
CMD ["--version"]
