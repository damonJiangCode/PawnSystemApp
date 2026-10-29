# React frontend

React + TypeScript + Material UI, served and built with Vite.
Dependencies and commands are managed by the root `package.json`.

## Structure

```text
frontend/
├── index.html             # Loads src/boot/index.tsx
├── vite.config.ts         # Vite root, environment and build settings
├── tsconfig.json          # Frontend type checking
└── src/
    ├── boot/              # React startup and main/window view selection
    ├── workspace/         # Main screen shell, search and tab navigation
    ├── windows/           # Content and layouts for additional desktop windows
    ├── modules/           # Feature-owned screens, components, hooks and API calls
    └── shared/            # Reusable UI components, HTTP adapters and browser utilities
```

## Feature modules

- `clients`: profiles, search, create/edit dialogs, photos, notes, holds and status.
- `transactions`: transaction page and workflow coordination.
- `tickets`: issuance, payments, ticket actions, quotes and printing.
- `items`: item search, records, categories, images and dialogs.
- `history`: ticket history and related actions.
- `reports`: daily, buyback, interest, overdue and XML report screens.
- `employees`: employee records; `reference`: cities, ID types, colors,
  locations, holidays and item categories (screens and the `referenceApi` wrapper).

## Boundaries

- Components/hooks manage display state, form feedback and user interactions.
- Feature `*.api.ts` files provide the calls used by screens. HTTP implementation
  lives in `src/shared/api/`: `http.ts` (base URL, `requestJson`), one
  `<domain>.http.ts` per backend module, each with a `create<Domain>HttpApi()`
  factory. `getAppApi()` returns the HTTP `client`, `employee` and `reference` domains plus
  the remaining desktop bridge domains (ticket, item, window, xmlReport). Tickets
  are migrating slice by slice: `ticket.http.ts` methods (lookups, pawn and sell so far) override
  the bridge's ticket methods.
- Lookup data (cities, ID types, colors, locations, holidays, item categories) is
  always read through `referenceApi` in `modules/reference/reference.api.ts`, also
  by client, ticket, payment, report and item screens.
- The backend owns authoritative validation, signatures, transactions and SQL.
  Frontend validation improves feedback; it does not replace backend checks.
- Root `shared/` contains cross-part models, payload contracts and pure helpers.
  `frontend/src/shared/` contains frontend-specific reusable code.
- `src/windows/` renders window contents; `electron/src/main/window/` creates and
  manages the actual native windows.

## Development

Run from the repository root:

- `npm run dev`: frontend, NestJS, Electron compiler and desktop app.
- `npm run dev:frontend`: Vite only, on port 5173.
- `npm run typecheck:renderer`: frontend TypeScript checks.
- `npm test`: helper/HTTP-adapter tests plus shared/desktop/migration checks.
- `npm run build`: Electron compilation, frontend type check and Vite assets.

Vite reads the root `.env`, including `VITE_API_BASE_URL`, and writes to root
`dist/`. Desktop-specific features require Electron; the UI is not yet fully
independent of the preload bridge.

See [architecture](../docs/architecture.md) and the root [README](../README.md).
