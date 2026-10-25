# Database code

This root-level folder owns the PostgreSQL schema, reference seeds, SQL functions,
views, environment loader, connection pool used by Electron, and initializer.
Nest retains its dependency-injection connection provider in server/src/database.
Both processes use the private root .env; environment variables take precedence.

Run commands from the project root:

```powershell
npm run build:main
# Initialize schema/reference data only when setting up or upgrading a database:
npm run db:init
```

Build output is `.electron-build/database/`. Electron's compiled entry point is
`.electron-build/src/main/index.js`. The build preparation script copies
seed/canadacities.csv beside the compiled seed module. The migration runner and
Docker migration image use this layout too.

Moving this code does not require recreating PostgreSQL, changing .env, running
db:init on an already initialized database, or reimporting Access records.
Restart npm run dev after the refactor. Rebuild the migration image before the
next new import; migration:execute performs that build automatically. Do not
rerun an import against an already populated database.
