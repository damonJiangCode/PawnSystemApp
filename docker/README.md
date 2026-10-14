# PostgreSQL service

Run these PowerShell commands from the PawnShopApp project root. The explicit
`--env-file` loads the project's ignored `.env`, even though Compose lives in docker/.

Configure `.env` with DB_HOST=localhost, DB_PORT=5432, DB_USER=moneyexpress,
DB_NAME=pawnsystemdb, and a local DB_PASSWORD.

```powershell
docker compose --env-file .env -f docker/compose.yaml config --quiet
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
npm ci
npm run db:init
docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb psql -U moneyexpress -d pawnsystemdb -c "\dt"
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
docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb pg_dump -U moneyexpress -d pawnsystemdb -Fc -f /tmp/before-access-import.dump
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
Get-Content docker/validate-migration.sql -Raw | docker compose --env-file .env -f docker/compose.yaml exec -T pawnsystemdb psql -v ON_ERROR_STOP=1 -U moneyexpress -d pawnsystemdb
node docker/validate-photos.cjs
```

Missing links and mismatched statistics must be zero. Sequence values must be at
least the highest imported number. Photo file existence must also be checked on
Windows; SQL counts alone do not establish that the actual images exist.

Create the final database backup using the same pg_dump/docker cp procedure with
`after-access-import.dump`, and independently copy the exports folder to backup
storage. Launch the app from the project root so relative photo paths resolve.
Use a separate test database for any new test transactions.

## Completed run: October 13, 2026 (America/Regina)

The target was confirmed empty, source SHA-256 checksums were recorded, and an
initialized-schema backup was taken before imports. All migration stages above
were run in order, with previews reviewed before commits. Employee preview ran
while the client commit was scanning; employee commit followed client photo export.

| Imported subject | Count |
| --- | ---: |
| Clients (includes fallback client) | 56,301 |
| Client IDs | 127,121 |
| Employees (includes fallback employee) | 102 |
| Tickets | 636,513 |
| Items | 494,408 |
| Ticket-item links | 1,075,693 |
| Client photos | 37,968 |
| Item photos | 38,434 |

Validation: zero missing ticket/item links, zero client-statistic mismatches,
and zero missing/outside-project photo paths. Sequences match the maximum numbers:
client 82,180; ticket 986,712; item 1,144,341. Application build and main/renderer
TypeScript checks passed. Desktop visual smoke testing is still pending.

The first item preview unexpectedly mapped every item to OTHER. Before committing,
the category parser was fixed to support Windows CRLF as well as LF line endings,
and a guard was added to reject an empty mapping document. The repeated preview
loaded the approved mappings: 411,130 specific subcategory rules, 45,689 parent
fallbacks, 17,087 parent-category fallbacks, and 20,502 global OTHER fallbacks.
Regression checks passed with `node --test migration-data/scripts/migrate-item.test.cjs`.

Important exceptions retained under existing rules:

- 13 duplicate client numbers reassigned; one fallback client added.
- Five earlier duplicate tickets skipped; six missing-client references use fallback.
- 468 duplicate inventory item numbers skipped after the first row.
- 192 invalid item numbers replaced with generated numbers.
- 36,078 legacy ticket-item rows skipped because the associated ticket is absent
  from the migrated ticket set. See item-migration.md for the full warnings.
- 16,315 clients received recalculated statistics.
- 19 active pawn tickets have UNKNOWN location. See
  `../migration-data/reports/active-location-review.md` for ticket numbers and
  original location codes. Resolve those mappings before production cutover.

Local backup artifacts are under the ignored `migration-data/backups/` folder:
`before-access-import.dump`, `after-access-import.dump`,
`photos-after-access-import.tar`, and `source-checksums.json`.
These are local copies on the same machine; copy them and the original Access
files to independent backup storage. They are not an off-machine backup.
The PostgreSQL volume is `pawnsystem_postgres_data`; image files are in Windows
under migration-data/exports, not in that volume.
The final dump's archive listing was checked with pg_restore. The photo tar was
read successfully and contains exactly 76,402 files. SHA-256 backup checksums are
recorded in backup-checksums.json. A full backup restore was not performed.

Photo backup command:

```powershell
tar -cf migration-data/backups/photos-after-access-import.tar -C migration-data/exports client-photos item-photos
```

To regenerate the read-only active location review report:

```powershell
docker compose --env-file .env -f docker/compose.yaml run --rm -v "${PWD}/docker:/app/docker:ro" migration docker/report-active-locations.cjs
```

The scripts emit UTC timestamps, which can show October 14 for this October 13
local run. Historical mapping documents retain their original dates and some
generated report prose refers to previous stages; this completed-run section
records the actual execution state. No production cutover or test transactions
were performed. npm dependency audit reported 19 vulnerabilities; dependency
versions were not changed as part of this migration.

```powershell
# Status and logs
docker compose --env-file .env -f docker/compose.yaml ps
docker compose --env-file .env -f docker/compose.yaml logs --tail 50 pawnsystemdb
# Stop; the named volume retains database records
docker compose --env-file .env -f docker/compose.yaml down
```

PostgreSQL's image applies initial credentials and database settings only when
the data volume is empty. Changing .env after initialization does not change
existing database users or passwords. Do not use `down -v` to stop this service:
it deletes the database volume.
