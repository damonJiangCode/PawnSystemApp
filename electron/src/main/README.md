# Main Process Code Map

`electron/src/main` is the Electron main process. It owns windows, IPC handlers,
business logic, and database access.

## Top Level

```text
main/
  index.ts
  image/
  ipc/
  window/
  modules/
  shared/
```

- `index.ts`: starts Electron and opens the main window.
- `image/`: registers the controlled `pawn-image://` protocol.
- `ipc/`: channel names and handler registration.
- `window/`: app window creation, reuse, and window-action handlers.
- Root-level `database/`: shared connection, schema, seed data, views, and initializer.
- `modules/`: domain handlers, services, repos, inputs, mappers.
- `shared/`: main-process helpers used by more than one module.

## Request Flow

Most renderer calls arrive here:

```text
preload/index.cjs
  -> ipc channel
  -> modules/*/*.handlers.ts
  -> modules/*/*.service.ts
  -> modules/*/*.repo.ts
  -> database
```

Window actions arrive here:

```text
preload/index.cjs
  -> window/window.handlers.ts
  -> window/window.manager.ts
  -> window/window.feature.ts
  -> window/window.create.ts
```

`window.manager.ts` keeps one `BrowserWindow` per screen. Reopening a screen
focuses its existing window; closing it removes that entry from the map.

## Window Files

- `window.handlers.ts`: receives window requests from the renderer.
- `window.manager.ts`: finds, registers, focuses, and reuses feature windows.
- `window.feature.ts`: defines how non-main feature windows are opened.
- `window.main.ts`: owns the main window lifecycle.
- `window.create.ts`: creates and configures a `BrowserWindow`.
- `window.url.ts`: builds renderer URLs and query parameters.

## File Roles

- `*.handlers.ts`: receives IPC calls and returns results.
- `*.input.ts`: validates and normalizes incoming data.
- `*.service.ts`: owns business rules and multi-step workflows.
- `*.repo.ts`: owns SQL.
- `*.mapper.ts`: converts database rows to shared models.
- `*.types.ts`: main-process local types only.

## Modules

Clients, employees and tickets moved to the NestJS server (`/client`,
`/employees`, `/tickets`); no client, employee or ticket IPC handlers remain, and
Electron main no longer needs `EMPLOYEE_PIN_SECRET`.

### items

Owns item search, create/update/delete, item images, categories, and linking
existing items to tickets.

Start here:

- `modules/items/item.handlers.ts`
- `modules/items/item.service.ts`
- `modules/items/item.repo.ts`

### reports

Owns daily, interest, buyback, and XML Report data. The renderer reaches the four
reports through the `report` preload domain (`reportApi` in
`frontend/src/modules/reports/report.api.ts`).

Start here:

- `modules/reports/report.handlers.ts`
- `modules/reports/report.service.ts`
- `modules/reports/report.repo.ts`

## Database

This folder lives at the repository root, beside `server/`, rather than under `electron/src/main`.

```text
database/
  schema/
  seed/
  views/
  functions/
  initialize.ts
```

- `schema/`: table definitions.
- `seed/`: reference data.
- `views/`: database views such as item status lookup.
- `functions/`: database guard functions.
- `initialize.ts`: runs schema and seed setup.

Runtime code should not duplicate schema rules manually unless the UI needs an
early validation message.

## Main Shared

```text
shared/
  createFieldError.ts
  imageStorage.ts
  runInTransaction.ts
```

- `createFieldError.ts`: standard field error shape.
- `imageStorage.ts`: saves images and safely resolves stored image paths.
- `runInTransaction.ts`: database transaction helper.
