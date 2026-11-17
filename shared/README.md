# Shared

The npm workspace `@pawnsystem/shared`: TypeScript types that describe what the frontend,
Electron and the server exchange. It holds **types only**.

| Path                 | Contains                                                   |
| -------------------- | ---------------------------------------------------------- |
| `models/`            | Business data, such as `client.model.ts`                   |
| `payload-contracts/` | Method inputs and results, such as `CreatePawnTicketInput` |

Import by package name, always with `import type`:

```ts
import type { Ticket } from "@pawnsystem/shared/models/ticket.model.ts";
```

Type imports are erased when compiled, so nothing from this package is loaded at run time.
That is why the frontend (Vite) and Electron (CommonJS) can both use it without a build step.

Rules:

- No functions, constants or classes. `tsconfig.json` allows erasable syntax only.
- No logic. Calculations belong to the server, which owns business rules. The frontend's
  display previews live in `frontend/src/shared/utils`.
- No React, Electron, database or filesystem imports.

```bash
npm run typecheck -w shared
```
