# Main process

| Path                   | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `index.ts`             | Starts Electron, native menus and the main window |
| `ipc/`                 | Channel names and handler registration            |
| `window/`              | Window creation, reuse and focus                  |
| `modules/xml-reports/` | LeadsOnline XML preview and submission            |
| `config/`, `shared/`   | Environment loading and small helpers             |

Clients, employees, reference data, tickets, items and reports moved to the NestJS server.
The XML report module is next.

## Request flow

```text
preload/index.cjs → IPC channel → *.handlers.ts → *.service.ts → *.repo.ts → database
```

Handlers receive IPC calls, services own the rules, and repos own the SQL.

## Windows

```text
preload/index.cjs → window.handlers.ts → window.manager.ts → window.feature.ts → window.create.ts
```

`window.manager.ts` keeps one `BrowserWindow` per screen. Reopening a screen focuses its
existing window, and closing it removes the entry. `window.url.ts` builds renderer URLs.
