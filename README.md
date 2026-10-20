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

Client name/DOB searches, client creation and client photo storage use the
Nest HTTP server. In a second terminal, configure
`server/.env` with the development database connection and run:

```bash
cd server
npm ci
npm run start:dev
```

The renderer defaults to `http://localhost:3000`. Set `VITE_API_BASE_URL` in the
root `.env` to change it, then restart Vite. The backend allows requests from
`http://localhost:5173` by default; set `CORS_ORIGINS` in `server/.env` to a
comma-separated list of renderer origins when needed. New client photos are
read over HTTP; legacy photos and other business operations still use Electron
while they are being ported.

Run the server from `server/`. By default, uploads are stored in
`../images/clients`; set `CLIENT_IMAGE_DIR` in `server/.env` to use another
persistent directory. Images have stable server-generated names and support PNG
or JPEG up to 5 MB.

For new clients, Capture keeps the photo in browser memory. Cancel discards it;
Add sends one JSON `POST /client` containing editable `client` details,
`identifications`, `photo: { fileName, base64 }`, and optional note-signature
input. The server creates the UUID photo path; clients cannot supply one.
It enforces the adult-age rule, owns statistics and timestamps, and commits
client/ID writes on one database connection. Failed saves roll back records and
remove the new photo, while the form retains the local photo for retry.
If the COMMIT outcome is uncertain or the process crashes, a photo may remain;
there is no automatic orphan cleanup. The unported edit flow still uses the
separate photo-upload endpoint.

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
| `migration/scripts/` | Migration tooling; private inputs are supplied separately |
| `docs/` | Architecture and public repository guidance |

See [architecture](docs/architecture.md), the README in each source module, and [Windows development setup](docs/instructions.md).

## Public source and private data

This repository publishes software source and sanitized configuration examples. Customer/employee records, identification data, photos, source databases, backups, migration reports, logs and actual credentials belong in ignored local storage. See [public repository policy](docs/public-repository.md).

Reviewed category and location conversion rules are versioned in `migration/mappings/` and included in a fresh clone. Supply the private Access databases separately. External SOAP reference documents remain private; ordinary application startup does not require them.
