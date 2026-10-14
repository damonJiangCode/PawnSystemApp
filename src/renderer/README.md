# Renderer Code Map

This folder is the React side of the app. The structure is feature-first:
most code should live in the module that owns the screen, workflow, or data it
is working with.

For full project-level tracing, start with:

- `docs/architecture.md`

## Top Level

```text
renderer/
  boot/
  workspace/
  windows/
  modules/
  shared/
```

- `boot/` starts the renderer and chooses whether to show the main app or a window view.
- `workspace/` owns the main work area shell.
- `windows/` chooses which non-main window view to show.
- `modules/` contains feature and workflow code.
- `shared/` contains only renderer utilities that are truly reused across modules.

## `boot/`

`boot/` owns renderer startup and top-level routing.

```text
boot/
  index.tsx
  RendererApp.tsx
```

- `index.tsx`: mounts React into the DOM.
- `RendererApp.tsx`: lazily loads either `WorkspaceApp` or `WindowView` from the URL.
- `RendererLoading.tsx`: displays the shared animated loading state while a renderer chunk loads.

## `workspace/`

`workspace/` owns the main work area shell.

```text
workspace/
  WorkspaceApp.tsx
  WorkspaceLayout.tsx
  useWorkspaceLayout.ts
  shell/
```

- `WorkspaceApp.tsx`: main window work area entry.
- `WorkspaceLayout.tsx`: tabs, top bar, and workspace page layout.
- `useWorkspaceLayout.ts`: workspace state and actions.
- `shell/`: top-bar and shell-only controls.

Do not put feature business logic in `boot/` or `workspace/`. If logic belongs to clients,
tickets, items, payment, history, or admin, put it in the matching module.

## `windows/`

`windows/` owns routing for non-main app windows.

```text
windows/
  WindowLayout.tsx
  WindowView.tsx
  windowRegistry.ts
```

- `WindowLayout.tsx`: common frame for non-main app windows.
- `WindowView.tsx`: reads the URL `screen` value and renders the matching window component.
- `windowRegistry.ts`: maps each screen key to its lazily loaded component.

The actual window content stays in the owning module. For example, ticket
search lives in `modules/tickets/menu-actions`, payment lives in
`modules/tickets/payment`, and item search/load lives in
`modules/items/menu-actions/item-search-window`.

## `modules/`

Modules are either domain modules or workflow modules.

Domain modules:

- `clients/`: client API wrapper, client page, dialogs, profile/results UI, client image/search hooks.
- `tickets/`: ticket API wrapper, ticket dialogs, ticket tables, ticket menu windows, payment workflow, print helper.
- `items/`: item API wrapper, item dialogs, item tables, and item search/load window.
- `employees/`: employee API wrapper and employee admin window.
- `admin/`: color, holiday, and location admin windows.
- `reports/`: report secondary windows.

Workflow modules:

- `transactions/`: active pawn/sell page, transaction hook, transaction handlers.
- `history/`: history page and history hook.

Recommended module shape:

```text
module/
  README.md
  module.api.ts
  pages/
  components/
  hooks/
  handlers/
  helpers/
```

Add more folders only when the name explains the purpose better than
`helpers/`:

```text
layout/ = layout constants or layout-only helpers
styles/ = module-owned visual constants
data/ = static/default module data
print/ = print template or print-only helpers
menu-actions/ = windows opened from menu/action buttons
```

The module root should stay quiet. Prefer keeping only `README.md`, the module
API wrapper, and a few clearly named folders at the root.

Common local file roles:

- `*.api.ts`: renderer wrapper around `getAppApi()?.domain`.
- `handlers/`: page-owned event handlers. Handlers can call APIs and set React state.
- `*.helpers.ts`: pure local helpers for that module.
- `*.types.ts`: local UI/workflow types, not database models.
- `*Layout.ts`: module-owned layout constants or layout components.
- `components/`: reusable pieces inside that module.
- `hooks/`: React hooks owned by that module.
- `pages/`: primary page components.
- `menu-actions/`: secondary windows opened from menu/action buttons.

If a component is only used by one module, keep it in that module. Do not move
it into `shared/` just because it looks reusable.

### Hook, Handler, Helper

Use this standard when splitting renderer workflow code:

```text
hook
  owns React state
  loads data
  creates handlers
  returns state and actions to the page

handler
  handles user events
  can call renderer APIs
  can set React state
  can open/close dialogs

helper
  pure function
  no React state setter
  no API call
  no window/appAPI side effect
```

The page can still receive an `actions` object from a hook because that is the
page's event surface. Files that implement those event functions should be named
`handlers` when they call APIs or set state.

### Renderer API Wrapper vs Shared API Contract

Renderer module files named `*.api.ts` are wrappers for UI code.

They are different from `src/shared/api-contracts`.

```text
src/shared/api-contracts
  defines the appAPI method shape
  shared by renderer, preload, and main
  no implementation

src/renderer/modules/*/*.api.ts
  gives UI code a simple module-owned call point
  calls getAppApi()?.client / ticket / item / employee / window
  may do renderer-side formatting or helper work
```

Example:

```text
shared/api-contracts/ticketApi.contract.ts
  defines createPawnTicket(input): Promise<Ticket>

renderer/modules/tickets/ticket.api.ts
  exports ticketApi.createPawnTicket(input)
  calls getAppApi()?.ticket.createPawnTicket(input)
```

## `shared/`

`shared/` is for renderer code that is genuinely cross-module.

```text
shared/
  api/
    app.api.ts
  components/
    CellTooltip.tsx
    ClientBar.tsx
  styles/
    layoutSizing.ts
    actionButtonStyles.ts
  utils/
    formError.ts
    formatters.ts
    imageUrl.ts
```

- `api/app.api.ts`: declares `window.appAPI` on the renderer side and exposes `getAppApi()`.
- `components/`: small cross-module React components.
- `styles/`: shared sizing and style helpers used by more than one module.
- `utils/`: pure formatting, controlled image URL, and form-error helpers.

Avoid calling `window.appAPI` directly from components. Use module API files or
`getAppApi()` inside module-level code:

```text
component/page -> module api or hook -> getAppApi().domain -> preload -> main handler -> service -> repo/db
```

## Shared Models And Contracts

Renderer code imports app-wide data shapes from `src/shared`, not from
`renderer/shared`.

- `src/shared/models/`: app data models such as `Client`, `Ticket`, `Item`.
- `src/shared/payload-contracts/`: method payloads such as inputs and response shapes.
- `src/shared/api-contracts/`: method shapes such as `AppApi`, `ClientApi`, `TicketApi`.

Renderer `shared/` is only for renderer helpers. App-wide model/API contracts
belong in `src/shared`.

## Naming Rules

- API methods should be action-first: `searchClients`, `createPawnTicket`, `loadItemsByTicket`.
- Renderer API files should use `*.api.ts`: `client.api.ts`, `ticket.api.ts`.
- Renderer API files should export `clientApi`, `ticketApi`, `itemApi`, or `employeeApi`, not `clientService`/`ticketService`; `service` is reserved for main-process business logic.
- `src/shared/api-contracts` is the contract for the app API shape; renderer `*.api.ts` is the wrapper used by UI code.
- Window frame layout belongs in `windows/WindowLayout.tsx`, not `shared/`.
- Top-level apps end in `App`: `RendererApp`, `WorkspaceApp`.
- Domain components should keep domain words when ambiguity is likely:
  `TransactionTicketsTable`, `HistoryTicketsTable`, `ItemActionsLayout`.
- If a layout belongs to one module, keep it in that module:
  `items/components/shared/ItemActionsLayout.tsx`,
  `tickets/components/shared/TicketActionsLayout.tsx`.

## Placement Rules

1. If it belongs to one domain, put it in that domain module.
2. If it belongs to one workflow, put it in that workflow module.
3. If it is used by multiple modules and has no domain ownership, put it in `renderer/shared`.
4. If it defines app data shape or IPC/API shape, put it in `src/shared`, not `renderer/shared`.
5. If a file grows too large, split local helpers, handlers, columns, dialog sections, or hooks next to the owner.

The goal is that review usually starts in one module and only leaves it for
`src/shared` contracts/models or small renderer helpers.
