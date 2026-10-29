# Windows Development Setup

## Requirements

- Install Node.js 22, Git, and Docker Desktop.
- Start Docker Desktop with Linux containers.
- Place `superpawnconv.mdb` and `Pictureconv.mdb` in `database/migration/source/`.

## First Run

Run these commands one at a time in PowerShell from the project root. Continue only if the previous command succeeds.

For the first import, close the app and use a fresh development database with an empty `database/migration/exports/` folder.

```powershell
npm ci
npm --prefix server ci
npm run migration:prepare
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
npm run migration:execute
npm run dev
```

`migration:prepare` checks requirements and creates `.env` with a generated database password and employee PIN secret if missing. `migration:execute` backs up the database, creates tables, imports Access data and photos, and checks the results. Mapping files are included in the repository.

If migration fails, stop and check `database/migration/reports/` before retrying; some data may already be imported. Backups are in `database/migration/backups/`.

## Next Time

Start Docker Desktop. If the database container is already running:

```powershell
npm run dev
```

If the database container is stopped, start it first:

```powershell
docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb
```

Run migration only for the initial import. Stop the app with `Ctrl+C`. To stop the database while keeping its data:

```powershell
docker compose --env-file .env -f docker/compose.yaml stop pawnsystemdb
```

Database data stays in Docker's persistent volume on this computer. Do not use `docker compose down -v`; it deletes that volume. Keep `.env` and private migration folders out of Git.

## Build

```powershell
npm run build
```

This compiles the application; it does not create a Windows installer.
