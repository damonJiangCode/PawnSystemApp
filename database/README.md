# Database

- This README is a developer guide, not a runtime input.
- `schema/`: PostgreSQL table and index definitions.
- `seed/`: initial reference data, including city data.
- `functions/` and `views/`: database functions and views.
- `env.ts` → `loadEnv`: reads the private root `.env`.
- `connection.ts` → `connect`: provides Electron's PostgreSQL connections.
- `initialize.ts` → `initializeDatabase`: creates schema and reference data.
- NestJS uses its own pool provider in `server/src/database/database.module.ts`.
- `migration/`: imports legacy Access data using scripts and versioned JSON rules.

## Commands

- Run commands from the project root with PostgreSQL running and `.env` configured.
- `npm run build:main`: compiles Electron/database code into `.electron-build/`.
- `npm run db:init`: builds and initializes the database; it does not import Access records.
- `npm run migration:execute`: initializes the schema automatically before importing;
  no separate `db:init` is needed for this workflow.
- Build output: `.electron-build/database/`; Electron entry: `.electron-build/electron/src/main/index.js`.
- Changing a CREATE TABLE definition does not alter existing tables; existing
  databases need the corresponding SQL applied separately.

## Access migration

- This README explains the workflow; scripts read Access files and JSON rules.
- Run every command from the project root.
- Install dependencies with `npm ci`, start Docker Desktop, and keep the app closed.

### Run in this order

- **Inputs:** put both files in `database/migration/source/`:
  `superpawnconv.mdb` and `Pictureconv.mdb`.
- **Prepare:** `npm run migration:prepare` creates missing local directories and
  `.env` with a generated password, then checks inputs, dependencies and Docker.
- **Start PostgreSQL:**

  ```bash
  docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
  ```

- **Import:** `npm run migration:execute` initializes the schema, imports records,
  exports photos, creates backups and validates the result.
- **Review:** inspect the generated reports before running `npm run dev`.

### Files

- `migration/scripts/`: migration code.
- `migration/mappings/`: required, Git-tracked category, location and ID type JSON rules.
- `migration/source/`: private Access inputs.
- `migration/exports/`: generated customer/item photos.
- `migration/reports/`: per-run results, execution manifest and validation logs.
- `migration/backups/`: per-run database and photo backups.
- `source/`, `exports/`, `reports/` and `backups/` are Git-ignored.

### Behavior

- `prepareDevMigration` in [prepareDevMigration.cjs](../scripts/prepareDevMigration.cjs)
  checks readiness; it does not start PostgreSQL or import records.
- `executeDevMigration` in [executeDevMigration.cjs](../scripts/executeDevMigration.cjs)
  writes to PostgreSQL and requires an empty target and clean photo exports.
- Imported clients start active with no hold: `is_active=true`, `hold_until=NULL`.
- Failed imports are not automatically erased or resumed; inspect the report
  before deciding how to retry.

### ID type mapping

- `migration/mappings/id-type-mapping.json` is the shared runtime input for ID
  seeds, static previews, client migration and the read-only audit.
- Established document types retain their mappings. Eight legacy-specific entries
  use distinct `Legacy CODE: DESCRIPTION` targets, initially inactive. Original
  abbreviations are preserved without claiming they are valid documents for new use.
- A number with no type is kept as `Other`; completely empty slots are ignored.
- Populated PHO or unknown codes block client import for preservation review.
  PHO means PHONE NO; the importer does not silently discard it or overwrite phones.
- Missing numbers are reported and skipped; no identification numbers are invented.
- Seed reruns insert missing targets and preserve all existing activation states.
  Execution manifests record the mapping checksum; prepare rejects invalid rules.
- Run from the project root:

  ```bash
  node --env-file=.env database/migration/scripts/audit-id-types.cjs
  ```

- Private reports: `migration/reports/id-type-audit-*/summary.json` and `summary.md`.
  They include per-code counts, source/mapping checksums and ID-count distributions,
  without customer names or actual identification/telephone numbers.
- The audit never changes mappings or database data. Counts cover ID slots only,
  not full client/ticket eligibility. New rules do not rewrite already-imported IDs;
  historical reclassification needs a separate import or correction.

- ID type names have an additional case-insensitive unique index on LOWER(type).
  It prevents duplicate reference labels without changing existing names or their
  case-sensitive foreign-key references. Existing databases need this index applied
  separately, as with other CREATE definition changes.
