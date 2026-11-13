# Server

NestJS HTTP backend. Default URL: `http://localhost:3000`.

## Run

From the repository root, with PostgreSQL running:

```bash
npm --prefix server ci
npm run dev:server
```

## Configuration

Settings come from the root `.env`, with an optional private `server/.env` override.

| Variable                                       | Purpose                                             |
| ---------------------------------------------- | --------------------------------------------------- |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection (also `DB_PORT`)              |
| `EMPLOYEE_PIN_SECRET`                          | Required, 32+ characters; the server will not start |
| `PORT`                                         | Default 3000                                        |
| `CORS_ORIGINS`                                 | Comma-separated; default `http://localhost:5173`    |
| `CLIENT_IMAGE_DIR`                             | Default `../images/clients`                         |
| `ITEM_IMAGE_DIR`                               | Default `../images/items`                           |

Relative image paths resolve from the server working directory.

## Modules

| Module                               | Routes                                   |
| ------------------------------------ | ---------------------------------------- |
| [Client](src/client/README.md)       | `/clients`                               |
| [Employee](src/employee/README.md)   | `/employees`                             |
| [Item](src/item/README.md)           | `/tickets/:ticketNumber/items`, `/items` |
| [Reference](src/reference/README.md) | `/reference/*`                           |
| [Report](src/report/README.md)       | `/reports/*`                             |
| [Ticket](src/ticket/README.md)       | `/tickets`                               |

## Conventions

- Each module is controller → service → repository. Controllers validate with
  class-validator DTOs, services own business rules, and repositories own parameterized SQL.
- Multi-step writes run in one transaction (`src/common/transaction.ts`).
- `strictValidationPipe` rejects unknown fields with 400. `fieldValidationPipe` returns
  `{ field, message }` so a form can focus the input.
- Photos are stored by `ImageStore` (`src/common/image-store.ts`). Responses carry
  `image_url`, built by `buildImageUrl`, and never the stored path.
- No route has authentication yet; see the [root README](../README.md#current-status).

## Verification

Run from `server/`:

```bash
npm test
npm run test:e2e
npm run build
```

`*.http.spec.ts` files run real Nest routes and DTOs with a mocked PostgreSQL pool. They
are not live-database integration tests.
