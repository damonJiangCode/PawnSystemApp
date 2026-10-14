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
