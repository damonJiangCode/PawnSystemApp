# Shared

TypeScript shapes and pure utilities used across the frontend and Electron. React-only shared code
belongs in `frontend/src/shared`.

| Path                 | Contains                                                     |
| -------------------- | ------------------------------------------------------------ |
| `models/`            | Business data, such as `client.model.ts`                     |
| `payload-contracts/` | Method inputs and results, such as `CreatePawnTicketInput`   |
| `api-contracts/`     | Methods available through `getAppApi()`, such as `TicketApi` |
| `utils/`             | Pure logic, such as interest calculations                    |

Contracts describe the communication surface and implement nothing. The wrappers that UI code
calls live in `frontend/src/modules/*/*.api.ts`.

Code here must not import React or Electron, connect to a database or touch the filesystem.

`utils/` calculations are display previews only. `server/src/ticket/ticket-finance.ts` is
authoritative, and the legal pickup hold exists only on the server.
