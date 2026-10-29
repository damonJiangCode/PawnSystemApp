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

### clients

Keeps legacy client readers used by ticket operations. Client CRUD-style updates,
reference queries and color reference operations use the NestJS HTTP server. Clients
are deactivated/reactivated rather than deleted. No client IPC handlers remain.

Start here:

- `modules/clients/client.repo.ts`
- `modules/clients/client.mapper.ts`

### tickets

Owns pawn/sell ticket creation, ticket update, expire, pickup, transfer,
payment workflows until their migration slices land. Ticket lookups (by client,
by number) and pawn/sell issuing moved to the NestJS server (`/tickets`).

Start here:

- `modules/tickets/ticket.handlers.ts`
- `modules/tickets/ticket.service.ts`
- `modules/tickets/ticket-payment.service.ts`
- `modules/tickets/ticket.repo.ts`

### items

Owns item search, create/update/delete, item images, categories, and linking
existing items to tickets.

Start here:

- `modules/items/item.handlers.ts`
- `modules/items/item.service.ts`
- `modules/items/item.repo.ts`

### employees

Employee search, create and update moved to the NestJS server (`/employees`); no
employee IPC channels remain. Only the PIN lookup used by ticket attribution
stays here until tickets are migrated: `employeeService.getEmployeeDisplayNameByPassword`
matches `pin_hash` (HMAC-SHA256 with `EMPLOYEE_PIN_SECRET` from the root `.env`).

- `modules/employees/employee.service.ts`
- `modules/employees/employee.repo.ts`
- `modules/employees/employee.pin.ts`

### reports

Owns daily, interest, buyback, and XML Report data.

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
