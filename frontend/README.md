# Frontend

React, TypeScript and Material UI, served and built with Vite. Dependencies and commands are in the
root `package.json`.

```text
frontend/src/
├── boot/       # React startup; chooses the main workspace or a window view
├── workspace/  # Main screen shell, search and tabs
├── windows/    # Registry and layout for additional desktop windows
├── modules/    # Feature screens, components, hooks and API wrappers
└── shared/     # Reusable UI, HTTP adapters and browser utilities
```

## Modules

| Module         | Owns                                                              | API                                            |
| -------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| `clients`      | Search, profiles, add and edit dialogs, photos, statistics        | [Client](../server/src/client/README.md)       |
| `transactions` | The page for active tickets (`pawned`, `sold`)                    | [Ticket](../server/src/ticket/README.md)       |
| `history`      | The page for closed tickets; repawn, load and reverse             | [Ticket](../server/src/ticket/README.md)       |
| `tickets`      | Ticket dialogs and tables, menu windows, Payment, print templates | [Ticket](../server/src/ticket/README.md)       |
| `items`        | Item tables, edit dialogs, photos, Item Search                    | [Item](../server/src/item/README.md)           |
| `employees`    | Employee administration                                           | [Employee](../server/src/employee/README.md)   |
| `reference`    | Lookup data and its management windows                            | [Reference](../server/src/reference/README.md) |
| `reports`      | Daily, Buyback, Interest, Overdue and XML report windows          | Electron main, through preload                 |

## Boundaries

- The frontend requests and renders. The server owns validation, calculations, signatures and
  transactions; frontend validation only improves feedback.
- Screens call a feature's `*.api.ts`, which calls `getAppApi()`.
- `src/shared/api/` holds `http.ts` and one `<domain>.http.ts` per backend module. `client`,
  `employee`, `item`, `reference` and `ticket` use HTTP. `report`, `xmlReport` and `window`
  use the preload bridge.
- All lookup data goes through `referenceApi` in `modules/reference/reference.api.ts`.
- `src/windows/` renders window content; `electron/src/main/window/` manages the native windows.
- Transaction page state lives in `useTransactionPage`. Its `handlers/` may call APIs and set state;
  `helpers/` are pure functions.

## Key workflows

### Ticket statuses

| Status             | Page        | History display |
| ------------------ | ----------- | --------------- |
| `pawned`           | Transaction |                 |
| `sold`             | Transaction |                 |
| `pawned_expired`   | History     | `E`             |
| `pawned_picked_up` | History     | `P`             |
| `sold_expired`     | History     | `E`             |

### Repawn

```text
Open Item Search with the source items → TicketPawnDialog → Save creates the ticket
→ print → switch to Transaction with the new ticket selected → Add To Ticket becomes available
```

The item window opens first, but items cannot be added until Transaction has a selected ticket.

### Reverse

`ReverseTicketDialog` shows the pickup amount and asks for a PIN. The server validates and restores
the ticket to Transaction, then both pages refresh with it selected. Only `pawned_expired` and
`pawned_picked_up` can be reversed.

### Item Search

- **Modes:** detail search (AND logic, at least one field) or exact item number.
- **Selection:** checkboxes are for Add To Ticket; selecting a row previews its image. Changing mode
  keeps checked rows, and a new search replaces only unchecked rows.
- **Actions:** Go To Ticket needs exactly one checked item. Add To Ticket takes several and needs a
  selected ticket on the Transaction page. Load appends items without duplicates.

### Payment

On Done, the window sends the amounts it showed. If any differs, the server rejects the batch (409)
and the window asks to reopen Payment for current amounts. The legal pickup hold comes from the
server's `pickup_allowed` and `earliest_pickup_date`; the window only warns and asks for confirmation.

### Photos

Records display from the server's `image_url`. A new photo stays in dialog state until Save, then the
server stores the file. `useClientImage` shows a client photo only after it loads, so a slow older
photo cannot replace a newer one.

## UI rules

- Money fields do not change on mouse wheel scroll.
- The selected ticket survives edits, and a new pawn or sale becomes selected.
- `print/ticketPrintTemplate.ts` prints on colored paper, so it adds no background color.

## Commands

Run from the repository root.

```bash
npm run dev
npm run dev:frontend
npm run typecheck:renderer
npm test
npm run build
```

Vite reads `VITE_API_BASE_URL` from the root `.env` and builds to the root `dist/`.
