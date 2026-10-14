# PostgreSQL service

Run these PowerShell commands from the PawnShopApp project root. The explicit
`--env-file` loads the project's ignored `.env`, even though Compose lives in docker/.

Configure `.env` with DB_HOST=localhost, DB_PORT=5432, DB_USER=pawnsystem_dev,
DB_NAME=pawnsystemdb, and a local DB_PASSWORD.

```powershell
docker compose --env-file .env -f docker/compose.yaml config --quiet
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
npm ci
npm run db:init
docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb psql -U pawnsystem_dev -d pawnsystemdb -c "\dt"
```

The container is named pawnsystemcontainer. Windows runs db:init using the source
in src/main/database and connects to the container through localhost:5432.
Initialization creates application schema and reference seeds; it does not import
the Access files. A later migration container connects using DB_HOST=pawnsystemdb.

## Access migration

Run from the project root. Source files must be named
`migration-data/source/superpawnconv.mdb` and `migration-data/source/Pictureconv.mdb`.
The source mount is read-only. Exports and reports are writable Windows folders.
The migration image excludes source databases, credentials, and exported photos.

```powershell
docker compose --env-file .env -f docker/compose.yaml build migration
docker compose --env-file .env -f docker/compose.yaml run --rm --entrypoint mdb-tables migration -1 migration-data/source/superpawnconv.mdb
docker compose --env-file .env -f docker/compose.yaml run --rm --entrypoint mdb-tables migration -1 migration-data/source/Pictureconv.mdb
```

Before writing records, check that business tables are empty and back up the target:

```powershell
New-Item -ItemType Directory -Force migration-data/backups | Out-Null
docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb pg_dump -U pawnsystem_dev -d pawnsystemdb -Fc -f /tmp/before-access-import.dump
docker cp pawnsystemcontainer:/tmp/before-access-import.dump migration-data/backups/before-access-import.dump
Get-FileHash migration-data/source/*.mdb | Select-Object Path,Hash | ConvertTo-Json | Set-Content migration-data/backups/source-checksums.json
```

Use a fresh backup filename on subsequent runs. Never reset an existing database
or rerun commit scripts blindly: review existing records and script behavior first.

Run these steps individually in order. Read each generated report before proceeding
to its commit command. Client and item previews can report blockers even when their
process exits successfully. City migration writes immediately. Photos write files
and update database paths. Mapping definitions remain in category-migration.md
and location-migration.md; those documents are inputs, not regenerated outputs.

```powershell
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-static.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-city.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-client.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-client.cjs --commit
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-client-photos.cjs --update-db
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-employee.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-employee.cjs --commit
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-ticket.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-ticket.cjs --commit
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-item.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-item.cjs --commit
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-item-photos.cjs --update-db
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-client-statistics.cjs
docker compose --env-file .env -f docker/compose.yaml run --rm migration migration-data/scripts/migrate-client-statistics.cjs --commit
```

These commands explicitly pass the project DB_NAME into the container, overriding
the scripts' default pawnsystemdb_migration. Here the target is pawnsystemdb.
Container-internal photo paths are relative to /app and stored as project-relative
paths, so Windows can resolve them from the PawnShopApp root. Actual images remain
in migration-data/exports/client-photos and item-photos. Back up both exports and DB.

For validation queries and desktop smoke tests see
`../migration-data/reports/final-migration-runbook.md`. Do not use its macOS reset
or production-replacement commands for this Docker setup. Active pawned tickets
with UNKNOWN locations prevent production cutover until their mapping is resolved.

Run the included validation queries from PowerShell:

```powershell
Get-Content docker/validate-migration.sql -Raw | docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb psql -v ON_ERROR_STOP=1 -U pawnsystem_dev -d pawnsystemdb
node docker/validate-photos.cjs
```

Missing links and mismatched statistics must be zero. Sequence values must be at
least the highest imported number. Photo file existence must also be checked on
Windows; SQL counts alone do not establish that the actual images exist.

Create the final database backup using the same pg_dump/docker cp procedure with
`after-access-import.dump`, and independently copy the exports folder to backup
storage. Launch the app from the project root so relative photo paths resolve.
Use a separate test database for any new test transactions.

## Local migration records

Generated reports, mapping documents, run records, exports and backups are private local files under `migration-data/`. They are excluded from this public repository. Migration scripts require your own private source files and mapping documents.
