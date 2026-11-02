# Item API

Items and the tickets they are on (`ticket_item`). Migration from Electron IPC
is in progress.

| Method + path                    | Success      |
| -------------------------------- | ------------ |
| GET /tickets/:ticketNumber/items | 200 `Item[]` |

- An unknown ticket returns `[]`; an invalid ticket number returns 400.
