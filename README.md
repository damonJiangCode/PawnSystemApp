# PawnSystemApp

An Electron desktop application for pawn shop operations, built with React, TypeScript, Material UI and PostgreSQL.

## Features

- Customer search, profiles, identification records, photos and holds.
- Pawn and sell tickets, linked items, ticket conversion, transfer and expiration.
- Interest payments, pickup, history, repawn and eligible ticket reversals.
- Item search, categories, photos and printable tickets.
- Daily, buyback, interest, overdue and LeadsOnline XML reporting.
- Employee, location, holiday and hair/eye color administration.

## Local development

Use a separate empty development database and fictional data.

```bash
npm ci
cp .env.example .env
```

Edit the ignored `.env` and set your own database password. To use the included local PostgreSQL service:

```bash
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
npm run db:init
npm run dev
```

`db:init` initializes schema and reference data; it does not create an initial employee or manager. The current desktop window setup targets the Vite development server at `localhost:5173`. This revision does not include a Windows installer configuration.

Optional LeadsOnline integration reads `LEADSONLINE_*` configuration from the private environment. Leave it unset for local development without external reporting.

## Verification

```bash
npm run typecheck:main
npm run typecheck:renderer
npm test
npm run build
```

## Repository structure

| Path | Purpose |
| --- | --- |
| `src/renderer/` | Frontend HTML entry, React screens, components and UI workflows |
| `src/main/` | Electron windows, business services and SQL repositories |
| `src/preload/` | IPC bridge exposed as `window.appAPI` |
| `src/shared/` | Shared models, contracts and calculation helpers |
| `vite.config.ts` | Frontend development server and build configuration |
| `docker/` | Local database and optional migration tooling |
| `migration-data/scripts/` | Migration tooling; private inputs are supplied separately |
| `docs/` | Architecture and public repository guidance |

See [architecture](docs/architecture.md), the README in each source module, and [database setup](docker/README.md).

## Public source and private data

This repository publishes software source and sanitized configuration examples. Customer/employee records, identification data, photos, source databases, backups, migration reports, logs and actual credentials belong in ignored local storage. See [public repository policy](docs/public-repository.md).

Migration mapping documents and external SOAP reference files are private local inputs, so migration tooling is not self-contained in a fresh public clone. The application does not require those files for ordinary startup.
