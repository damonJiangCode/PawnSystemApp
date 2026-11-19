# Frontend

React, TypeScript and Material UI, built with Vite. npm workspace `@pawnsystem/frontend`.

```text
frontend/src/
├── main.tsx      # Entry: the main window, or a popup for `?window=<name>`
├── main-window/  # Top bar, client search, shortcut buttons and page tabs
├── pages/        # The three tabs: client/, transaction/, history/
├── windows/      # Popup windows, one folder each; registry.ts maps names to screens
├── dialogs/      # Dialogs opened from several places: client/, ticket/, item/
├── components/   # Small shared UI (DateField, ConfirmDialog, ItemsTable, ...)
├── api/          # One file per server module, plus http.ts and window.ts
├── lib/          # Pure functions: formatting, dates, form errors, money previews, printing
└── styles/       # Shared sizes, button styles and colors
```

## Rules

- A page or window keeps its own hooks, tables, handlers and helpers in its folder. A dialog used
  by one window stays with it; shared dialogs go in `dialogs/`.
- Tests sit next to the file: `<name>.test.ts`.
- Folders kebab-case, components `PascalCase.tsx`, hooks `useX.ts`, others `camelCase.ts`. No
  dotted names, at most three folder levels.
- Screens call the API object for a server module, such as `clientApi` from `api/client.ts`.
  `api/http.ts` turns error responses into `Error`s that keep the server's `field` and `status`.
- Only opening and focusing windows goes through Electron, via `getWindowApi()` in `api/window.ts`.
  A new popup needs an entry in `windows/registry.ts`.
- The server owns validation, calculations and transactions. The frontend requests and renders.

## Pages and windows

| Folder                                   | Shows                                             | Server module       |
| ---------------------------------------- | ------------------------------------------------- | ------------------- |
| `pages/client`                           | Client search, profile, photo and statistics      | client              |
| `pages/transaction`                      | Active tickets (`pawned`, `sold`) and their items | ticket, item        |
| `pages/history`                          | Closed tickets; repawn, load and reverse          | ticket              |
| `windows/payment`, `windows/quote`       | Pickups, interest extensions and quotes           | ticket              |
| `windows/tickets`                        | Ticket Search, Expire and Stolen                  | ticket              |
| `windows/item-search`                    | Item Search                                       | item                |
| `windows/reports`                        | Daily, Buyback, Interest, Overdue and XML reports | report, xml-report  |
| `windows/reference`, `windows/employees` | Lookup data; employee administration              | reference, employee |

Server module docs are in `server/src/<module>/README.md`.

## Behavior worth knowing

- **Payment:** Done sends the amounts the window showed. If any differs, the server rejects the
  batch (409) and the window asks to reopen. The legal pickup hold only warns.
- **Repawn:** Item Search opens first, but items are added only after the new ticket is selected
  on Transaction.
- **Reverse:** only `pawned_expired` and `pawned_picked_up`; needs a PIN, then both pages refresh.
- **Item Search:** checkboxes are for Add To Ticket; a new search keeps checked rows.
- **Photos:** shown from the server's `image_url`; a new photo uploads on Save.
- Money fields ignore the mouse wheel. The print template adds no background (colored paper).

## Commands

From the repository root. `npm run dev` starts the whole app.

```bash
npm run dev -w frontend
npm run typecheck -w frontend
npm test -w frontend
npm run build -w frontend
```

Vite reads `VITE_API_BASE_URL` from the root `.env` (default `http://localhost:3000`). Keep it on
localhost for development: the shop server holds production data.
