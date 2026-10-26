# Access migration

- This README explains the workflow; scripts read Access files and JSON rules.
- Run every command from the project root.
- Install dependencies with `npm ci`, start Docker Desktop, and keep the app closed.

## Run in this order

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

## Files

- `scripts/`: migration code.
- `mappings/`: required, Git-tracked category and location JSON rules.
- `source/`: private Access inputs.
- `exports/`: generated customer/item photos.
- `reports/`: per-run results, execution manifest and validation logs.
- `backups/`: per-run database and photo backups.
- `source/`, `exports/`, `reports/` and `backups/` are Git-ignored.

## Behavior

- `prepareDevMigration` in [prepareDevMigration.cjs](../../scripts/prepareDevMigration.cjs)
  checks readiness; it does not start PostgreSQL or import records.
- `executeDevMigration` in [executeDevMigration.cjs](../../scripts/executeDevMigration.cjs)
  writes to PostgreSQL and requires an empty target and clean photo exports.
- Imported clients start active with no hold: `is_active=true`, `hold_until=NULL`.
- Failed imports are not automatically erased or resumed; inspect the report
  before deciding how to retry.
