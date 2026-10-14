# App Architecture

This app is an Electron pawn shop system.

The code is split by where it runs:

```text
src/
  renderer/  React UI
  preload/   safe bridge between renderer and main
  main/      Electron main process, business logic, database access
  shared/    models and API/payload contracts used by both sides
```

Local images are displayed through the controlled `pawn-image://` protocol.
The renderer receives a URL while the main process validates and resolves the
stored path.

## Mental Model

Use this path when tracing most user actions:

```text
renderer page/dialog
  -> renderer module api
  -> renderer/shared/api/app.api.ts
  -> preload/index.cjs
  -> main ipc handler
  -> main service
  -> main repo
  -> database
```

Example:

```text
TicketPawnDialog
  -> ticket.api.ts
  -> getAppApi().ticket.createPawnTicket
  -> preload/index.cjs
  -> ticket.handlers.ts
  -> ticket.service.ts
  -> ticket.repo.ts
  -> ticket table
```

## Layer Responsibilities

### Renderer

`src/renderer` owns the screen.

It should handle:

- what the user sees
- form state
- selected rows
- dialogs
- table layout
- calling app APIs

It should not directly know SQL or database details.

### Preload

`src/preload/index.cjs` exposes the safe app API to the renderer.

It translates renderer method calls into IPC channel calls:

```text
renderer calls appAPI.ticket.createPawnTicket(input)
preload sends ADD_PAWN_TICKET through ipcRenderer.invoke(...)
```

Preload should stay thin. It should not contain business rules.

### Main

`src/main` owns business logic and database access.

Main code is usually split into:

- `*.handlers.ts`: IPC entry points.
- `*.service.ts`: business rules and multi-step workflows.
- `*.repo.ts`: database reads and writes.
- `*.input.ts`: validation and input normalization.
- `*.mapper.ts`: convert database rows into app models.

### Shared

`src/shared` owns cross-runtime shapes.

- `models/`: business data models, such as `Client`, `Ticket`, `Item`.
- `payload-contracts/`: inputs and result shapes for API methods.
- `api-contracts/`: method shapes exposed through `window.appAPI`.
- `utils/`: pure shared calculation helpers.

Do not put renderer-only UI helpers in `src/shared`. Renderer helpers belong in
`src/renderer/shared`.

## API, Contract, Service, Repo

The app uses these words with specific meaning:

```text
api contract = the shape of methods available through appAPI
payload contract = the input/result shape used by those methods
renderer api = a small wrapper that UI code calls
handler = the main-process receiver for IPC calls
service = business logic
repo = database access
model = business data shape
```

There are two different uses of the word `api`:

```text
src/shared/api-contracts
  = API contract
  = defines the appAPI method shape shared by renderer, preload, and main
  = does not execute anything

src/renderer/modules/*/*.api.ts
  = renderer API wrapper
  = the clean function set that UI code calls
  = calls getAppApi() and may do renderer-side formatting or helpers
```

So `shared/api-contracts` answers "what methods exist?", while renderer
`*.api.ts` answers "what should this module call from UI code?".

Example:

```text
src/shared/api-contracts/ticketApi.contract.ts
  says ticket.createPawnTicket(input) exists

src/shared/payload-contracts/ticket.contract.ts
  says what CreatePawnTicketInput looks like

src/renderer/modules/tickets/ticket.api.ts
  gives renderer code a clean ticketApi.createPawnTicket(...) wrapper

src/main/modules/tickets/ticket.handlers.ts
  receives the IPC request

src/main/modules/tickets/ticket.service.ts
  decides how pawn tickets are created

src/main/modules/tickets/ticket.repo.ts
  writes the ticket row
```

## Window Model

The main app runs in the main workspace window.

Other windows, such as payment, ticket search, item search, and reports, are
opened by the main process and rendered by `src/renderer/windows`.

Trace a window like this:

```text
renderer button
  -> getAppApi().window.openSomeWindow(...)
  -> preload/index.cjs
  -> main/window/window.handlers.ts
  -> main/window/window.feature.ts
  -> renderer/windows/WindowView.tsx
  -> renderer/windows/windowRegistry.ts
  -> owning module window component
```

Actual window content should stay with its owning module. The `windows/` folder
only routes and frames those windows.

## Database Model

Database setup lives in:

```text
src/main/database/
  schema/
  seed/
  views/
  functions/
  initialize.ts
```

Runtime database access should usually go through repos in `src/main/modules`.

Schema files define structure. Seed files define initial reference data.
Services and repos define runtime behavior.

## Review Entry Points

When reviewing a feature, start here:

- `src/renderer/README.md`: renderer folder map.
- `src/main/README.md`: backend/main folder map.
- `src/shared/README.md`: model and contract rules.
- The README inside the owning renderer module.
