# Database

PostgreSQL schema, seed data and the legacy Access migration. There is no migration
framework: `database/schema/` holds `CREATE ... IF NOT EXISTS` SQL.

| Path            | Purpose                                      |
| --------------- | -------------------------------------------- |
| `schema/`       | Tables and indexes                           |
| `seed/`         | Reference data, including cities             |
| `functions/`    | Database guard functions                     |
| `views/`        | Views such as item status lookup             |
| `initialize.ts` | Creates the schema and reference data        |
| `connection.ts` | PostgreSQL connections for Electron          |
| `migration/`    | Access import scripts and JSON mapping rules |

NestJS uses its own pool in `server/src/database/database.module.ts`.

## Commands

Run from the project root, with PostgreSQL running and `.env` configured.

```bash
npm run db:init
```

This builds and initializes the database. It does not import Access records or create an employee.

## Changing an existing database

Editing a `CREATE TABLE` definition does not alter existing tables, so apply the change by
hand and document it here. These have already been applied to the dev database:

- Indexes `idx_ticket_client_number`, `item_category_name_normalized_idx`,
  `item_subcategory_name_normalized_idx` and the unique `LOWER(type)` index on `id_type`.
  See `schema/` for their definitions.
- Removed the unused partial-payment columns:

  ```sql
  ALTER TABLE ticket
    DROP COLUMN IF EXISTS partial_payment,
    DROP COLUMN IF EXISTS partial_payment_datetime;
  ```

- Converted plain-text employee passwords to `pin_hash`. Back up the table, preview, then commit:

  ```bash
  node --env-file=.env database/migration/scripts/hash-employee-pins.cjs
  node --env-file=.env database/migration/scripts/hash-employee-pins.cjs --commit
  ```

## Access migration

Install dependencies with `npm ci`, start Docker Desktop and keep the app closed.

1. Put `superpawnconv.mdb` and `Pictureconv.mdb` in `database/migration/source/`.
2. Check readiness. This also creates a missing `.env` with generated secrets.

   ```bash
   npm run migration:prepare
   ```

3. Start PostgreSQL.

   ```bash
   docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
   ```

4. Import. This initializes the schema, imports records, writes photos to `images/`,
   creates backups and validates the result. It needs an empty database and `images/` folder.

   ```bash
   npm run migration:execute
   ```

5. Review `migration/reports/` before running `npm run dev`. Failed imports are not erased
   or resumed automatically.

The database stores relative photo paths such as `images/items/<file>`. `source/`, `reports/`,
`backups/` and `images/` are ignored by Git.

## ID type mapping

`migration/mappings/id-type-mapping.json` drives ID seeds, client migration and the audit.

- A number with no type is kept as `Other`; empty slots are ignored.
- Legacy-specific types are created inactive, so they are not offered for new records.
- Populated `PHO` (phone number) or unknown codes block client import for review.
- Missing numbers are reported and skipped; no identification numbers are invented.

The read-only audit writes counts, without customer data, to `migration/reports/`:

```bash
node --env-file=.env database/migration/scripts/audit-id-types.cjs
```

## Employee PINs

`employee.pin_hash` stores HMAC-SHA256(`EMPLOYEE_PIN_SECRET`, trimmed PIN). A keyed hash keeps
PIN-only lookup and the `UNIQUE` constraint working, which a salted hash cannot.

Back up `EMPLOYEE_PIN_SECRET` with the database. Changing or losing it makes every stored PIN unverifiable.
