# PawnSystemApp

A full-stack desktop application for pawn shop operations, built with React,
Electron, NestJS and PostgreSQL. It covers customer records, pawn/sell workflows,
item tracking, payments and reporting, with tooling to import legacy Microsoft
Access data.

## Features

- **Clients:** name-prefix and birthday search; profiles, identification records,
  photos, signed notes, holds, and activation/deactivation. Inactive clients
  cannot receive new tickets; existing-ticket operations remain available.
- **Tickets and payments:** pawn/sell tickets, conversion, transfers, expiration,
  pickup, interest payments, history, repawn and eligible reversals.
- **Items:** search, categories, ticket links, photos and printable tickets.
- **Reports:** daily, buyback, interest and overdue reports, plus optional
  LeadsOnline XML validation and submission.
- **Employees and reference data:** employee records, locations, holidays and hair/eye colors.
- **Legacy data import:** Access records and photos mapped into PostgreSQL,
  with previews, backups and post-import validation.

## Technology and architecture

| Area         | Technology and responsibility                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Frontend     | React, TypeScript, Material UI / Data Grid and Vite; screens, form state, validation feedback and HTTP requests                  |
| Desktop      | Electron main/preload; application windows, native menus and controlled desktop access                                           |
| HTTP backend | NestJS; controllers, DTO validation with class-validator/class-transformer, business services and SQL repositories               |
| Database     | PostgreSQL 16 and node-postgres (`pg`); parameterized SQL, connection pooling and transactional writes                           |
| Migration    | Node.js scripts, Docker and mdbtools; versioned JSON mapping rules for legacy Access data                                        |
| Testing      | Node test runner for frontend/shared/desktop helpers and migration scripts; Vitest and Supertest for backend unit and HTTP tests |

The project is being separated into an HTTP backend and a desktop client:

```text
React UI ── HTTP ── NestJS controllers → services → repositories → PostgreSQL
    │
    └── preload bridge ── Electron windows and native menus
```

Client, employee, reference and ticket workflows use HTTP. Items, reports and XML
reports still run through Electron services/repositories while their HTTP
endpoints are developed. The desktop app currently requires Vite; building
assets does not yet provide a standalone installer.

Client writes validate inputs, enforce business rules and save related records
in transactions. Updates lock the client row. Employee passwords attribute
sensitive actions and add signatures; they do **not** establish a login session.
See the [Client API](server/src/client/README.md) and
[Reference API](server/src/reference/README.md) for routes, inputs and test coverage.

## Repository structure

```text
PawnSystemApp/
├── frontend/      # React entry HTML, Vite/TypeScript config and src/
├── electron/      # Desktop TypeScript config and src/{main,preload}/
├── server/        # NestJS HTTP backend and backend tests
├── database/      # Schema, seeds, views, initialization and migration/
├── docker/        # PostgreSQL Compose and optional migration image
├── shared/        # Shared TypeScript models, contracts and pure utilities
├── scripts/       # Project startup, builds, tests and migration orchestration
├── docs/          # Architecture and development notes
└── package.json   # Root dependency management and combined commands
```

- `frontend/src/modules/` groups UI code by feature; `shared/` inside the frontend
  contains reusable UI components and browser utilities.
- `electron/src/main/` contains windows, menus and remaining desktop business
  workflows; `electron/src/preload/` exposes the controlled bridge.
- Root `shared/` contains cross-part code, without React or Electron runtime imports.
- Frontend and Electron dependencies are managed at the root. The NestJS server
  retains its own `package.json` and lockfile; npm workspaces are not required.

More detail: [frontend](frontend/README.md), [Electron](electron/README.md),
[server](server/README.md), [database](database/README.md) and
[architecture](docs/architecture.md).

## Local development

Prerequisites: Node.js/npm, Docker Desktop and a desktop environment for Electron.
Run from the repository root:

```bash
npm ci
npm --prefix server ci
cp .env.example .env
```

Set your development database credentials and `EMPLOYEE_PIN_SECRET` (at least
32 random characters) in the ignored root `.env`.
NestJS also supports a private `server/.env` override. The frontend reads
`VITE_API_BASE_URL` from the root `.env` (default `http://localhost:3000`).

```bash
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
npm run db:init
npm run dev
```

- PostgreSQL: host port **5433** → container port **5432** by default.
- Vite: **5173**, with frontend hot updates.
- NestJS: **3000**, with watch/restart.
- Electron: starts after Vite, NestJS and its compiled entry are ready.
  Main-process changes compile in watch mode; restart Electron after main/preload edits.
- Ctrl+C stops the combined development processes; Docker stays running.
- `db:init` initializes schema/reference data; it does not create an initial employee.

Individual commands: `npm run dev:frontend`, `npm run dev:server`,
`npm run dev:main` and `npm run dev:app`. Use either the combined command or
individual processes to avoid port conflicts.

For Access import, follow [database migration guide](database/README.md#access-migration).
Use an isolated development database and fictional data for testing. LeadsOnline
credentials are optional for local development without external submissions.

## Verification

```bash
npm run typecheck:main
npm run typecheck:renderer
npm test
npm --prefix server test
npm --prefix server run test:e2e
npm --prefix server run build
npm run build
```

Backend HTTP tests use real Nest routes with mocked database dependencies; they
are not live-PostgreSQL integration tests. Root tests include migration safety and
mapping checks. Builds produce root `dist/`, `.electron-build/` and `server/dist/`.

## Private data

Credentials, Access source files, client/employee records, photos, migration
exports/reports and backups are ignored local data. Commit source code and
sanitized configuration examples only. The directory refactor does not require
resetting the database or rerunning a data migration.
