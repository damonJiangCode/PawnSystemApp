# Frontend

React, TypeScript and Material UI, served and built with Vite. This folder is the npm workspace
`@pawnsystem/frontend`, with its own dependencies and scripts in `package.json`.

```text
frontend/src/
├── main.tsx      # Entry: renders the main window, or a popup window for `?window=<name>`
├── main-window/  # The main window: top bar, client search, shortcut buttons and page tabs
├── pages/        # The three tabs: client/, transaction/, history/
├── windows/      # Popup windows: registry.ts, PopupWindow, WindowFrame and one folder each
├── dialogs/      # Dialogs used from more than one place, by entity: client/, ticket/, item/
├── components/   # Small shared UI pieces (DateField, ConfirmDialog, ItemsTable, ...)
├── api/          # One file per server module, plus http.ts and the preload window bridge
├── lib/          # Pure functions: formatting, dates, form errors, money previews, printing
└── styles/       # Shared sizes, button styles and colors
```

Where things live:

- A page or popup window keeps its own hooks, tables, handlers and helpers in its folder, such as
  `pages/transaction/useTransactionPage.ts` or `windows/payment/columns.tsx`.
- A dialog only one window opens stays with that window (`windows/payment/PickupHoldDialog.tsx`);
  dialogs opened from several places live in `dialogs/`.
- Tests sit next to the file they test, as `<name>.test.ts`.

Naming: folders in kebab-case, components `PascalCase.tsx`, hooks `useX.ts`, everything else
`camelCase.ts`. No dotted names (`columns.tsx`, not `payment.columns.tsx`) and at most three
folder levels.

## Pages and windows

| Folder                                   | Shows                                                 | API                                                                                          |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pages/client`                           | Client search results, profile, photo and statistics  | [Client](../server/src/client/README.md)                                                     |
| `pages/transaction`                      | Active tickets (`pawned`, `sold`) and their items     | [Ticket](../server/src/ticket/README.md), [Item](../server/src/item/README.md)               |
| `pages/history`                          | Closed tickets; repawn, load and reverse              | [Ticket](../server/src/ticket/README.md)                                                     |
| `windows/payment`, `windows/quote`       | Pickups and interest extensions; a quote for a client | [Ticket](../server/src/ticket/README.md)                                                     |
| `windows/tickets`                        | Ticket Search, Expire and Stolen                      | [Ticket](../server/src/ticket/README.md)                                                     |
| `windows/item-search`                    | Item Search                                           | [Item](../server/src/item/README.md)                                                         |
| `windows/reports`                        | Daily, Buyback, Interest, Overdue and XML reports     | [Report](../server/src/report/README.md), [XML](../server/src/xml-report/README.md)          |
| `windows/reference`, `windows/employees` | Lookup data management; employee administration       | [Reference](../server/src/reference/README.md), [Employee](../server/src/employee/README.md) |

## Boundaries

- The frontend requests and renders. The server owns validation, calculations, signatures and
  transactions; frontend validation only improves feedback.
- Screens import the API object for a server module, such as `clientApi` from `api/client.ts`.
  Each file holds that module's HTTP calls; `api/http.ts` builds URLs and turns error responses
  into `Error`s that keep the server's `field` and `status`.
- Only opening and focusing windows goes through Electron: `getWindowApi()` in `api/window.ts`
  returns the preload bridge, or `undefined` in a plain browser.
- All lookup data goes through `referenceApi`, which caches item categories per window.
- `src/windows/` renders popup content; `electron/src/main/window/` manages the native windows.
  A new popup needs an entry in `windows/registry.ts`.
- Transaction page state lives in `useTransactionPage`. Its `*Handlers.ts` files may call APIs and
  set state; `transactionHelpers.ts` holds pure functions.

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
- `lib/ticketPrintTemplate.ts` prints on colored paper, so it adds no background color.

## Commands

Run from the repository root.

`npm run dev` starts the whole app. To run only the frontend:

```bash
npm run dev -w frontend
npm run typecheck -w frontend
npm test -w frontend
npm run build -w frontend
```

Vite reads `VITE_API_BASE_URL` from the root `.env` and builds to `frontend/dist/`. Tests use
`node:test` with the `tsx` loader (`node --import tsx --test`), which strips types without
checking them; type errors are caught by `npm run typecheck`.
