# Main process

| Path       | Purpose                                           |
| ---------- | ------------------------------------------------- |
| `index.ts` | Starts Electron, native menus and the main window |
| `ipc/`     | Channel names and handler registration            |
| `window/`  | Window creation, reuse and focus                  |

All business workflows (clients, employees, reference data, tickets, items, reports and
LeadsOnline XML reports) run on the NestJS server. The main process only manages windows.

## Windows

```text
preload/index.cjs → window.handlers.ts → window.manager.ts → window.feature.ts → window.create.ts
```

`window.manager.ts` keeps one `BrowserWindow` per screen. Reopening a screen focuses its
existing window, and closing it removes the entry. `window.url.ts` builds renderer URLs.
