# Database

- This README is a developer guide, not a runtime input.
- `schema/`: PostgreSQL table and index definitions.
- `seed/`: initial reference data, including city data.
- `functions/` and `views/`: database functions and views.
- `env.ts` → `loadEnv`: reads the private root `.env`.
- `connection.ts` → `connect`: provides Electron's PostgreSQL connections.
- `initialize.ts` → `initializeDatabase`: creates schema and reference data.
- NestJS uses its own pool provider in `server/src/database/database.module.ts`.
- `migration/`: imports legacy Access data; see [migration guide](migration/README.md).

## Commands

- Run commands from the project root with PostgreSQL running and `.env` configured.
- `npm run build:main`: compiles Electron/database code into `.electron-build/`.
- `npm run db:init`: builds and initializes the database; it does not import Access records.
- `npm run migration:execute`: initializes the schema automatically before importing;
  no separate `db:init` is needed for this workflow.
- Build output: `.electron-build/database/`; Electron entry: `.electron-build/src/main/index.js`.
- Changing a CREATE TABLE definition does not alter existing tables; existing
  databases need the corresponding SQL applied separately.
