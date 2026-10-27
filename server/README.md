# PawnSystem HTTP Server

NestJS backend. Client operations, reference queries, color and location reference operations use
HTTP; ticket operations are not fully converted yet. Default URL: `http://localhost:3000`.

## Development

From the project root:

```bash
npm --prefix server ci
npm run dev:server
# Or run frontend + server + Electron together:
npm run dev
```

Configure the private `server/.env` with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`
and `DB_PASSWORD`; start PostgreSQL separately. `PORT` defaults to 3000.
`CORS_ORIGINS` defaults to `http://localhost:5173` (comma-separated origins).
The combined root launcher assumes Vite 5173 and backend 3000.

New images default to `../images/clients` (`CLIENT_IMAGE_DIR`); imported images
can be served from `../database/migration/exports/client-photos`
(`CLIENT_MIGRATION_IMAGE_DIR`). Relative storage paths resolve from the server
working directory. Do not commit credentials or customer photos.

Sources: `bootstrap` in [src/main.ts](src/main.ts), `DatabaseModule` pool
`useFactory` in [src/database/database.module.ts](src/database/database.module.ts),
`ClientImageService.constructor` in
[src/client/client-image.service.ts](src/client/client-image.service.ts), and
`scripts` in [../package.json](../package.json).

## Client API status

These are the actual routes in `ClientController` in
[src/client/client.controller.ts](src/client/client.controller.ts):

| Status      | Endpoint                    | Input                                                            | Controller method |
| ----------- | --------------------------- | ---------------------------------------------------------------- | ----------------- |
| Implemented | GET /client                 | Query: firstName?, lastName?                                     | search            |
| Implemented | GET /client/by-dob          | Query: dateOfBirth=YYYY-MM-DD                                    | searchByDob       |
| Implemented | POST /client                | JSON: client, identifications, photo, optional notes attribution | create            |
| Implemented | PATCH /client/:clientNumber | JSON: submitted client fields, optional IDs/photo/attribution    | update            |
| Implemented | GET /client/images          | Query: path                                                      | loadImage         |

PATCH covers profile edits, notes, photo replacement, client-only pickup, hold,
and deactivate/reactivate. There is no separate hold/status/notes route. Clients
cannot be deleted: there is no DELETE route or client deletion bridge. PUT and
standalone POST /client/images are not implemented; images are submitted inside
POST/PATCH. Search and write results include client details and identifications.

`ClientService.create/update` in [client.service.ts](src/client/client.service.ts)
handle business rules and transactions. `ClientRepository` methods in
[client.repository.ts](src/client/client.repository.ts) handle parameterized SQL;
`mapRowToClient` in [client.mapper.ts](src/client/client.mapper.ts) creates responses.
`getAppApi` in [app.api.ts](../frontend/src/shared/api/app.api.ts) connects renderer
client operations to HTTP. Concise module references:
[Client](src/client/README.md) and [Reference](src/reference/README.md).

### Reference queries (implemented)

`ReferenceController` in [reference.controller.ts](src/reference/reference.controller.ts)
exposes four read-only routes with no required parameters:

| Endpoint                          | Response                                                            | Repository method  |
| --------------------------------- | ------------------------------------------------------------------- | ------------------ |
| GET /client/reference/cities      | { provinces: string[], citiesByProvince: Record<string, string[]> } | loadCities         |
| GET /client/reference/id-types    | string[]                                                            | loadIdTypes        |
| GET /client/reference/hair-colors | string[] of active colors                                           | loadColors('hair') |
| GET /client/reference/eye-colors  | string[] of active colors                                           | loadColors('eye')  |

`ReferenceRepository` in [reference.repository.ts](src/reference/reference.repository.ts)
reads existing tables for dropdowns and writes color changes for reference editing.
No seed data is created by these endpoints.
`ReferenceModule` imports the database pool. Every reference endpoint uses
`ReferenceController` → `ReferenceService` → `ReferenceRepository`; see the
[Reference README](src/reference/README.md) for GET /all, POST and PATCH routes.
`getAppApi` routes the existing loadCities/loadIdTypes/loadHairColors/loadEyeColors
contract to `loadClientReferenceHttp`; old query IPC handlers were removed.

### Rules

- POST requires client details, 2–20 identifications and a photo. Age must be at
  least 18 using the Regina calendar date. Photos remain in renderer state until
  submission; the server assigns UUID filenames to PNG/JPEG images up to 5 MB.
- PATCH preserves omitted fields, IDs and photos. Provided IDs replace the ID
  set and must contain 2–20 entries. Optional text clears with `""`; only
  `hold_until` accepts `null` to clear. Unknown or server-owned fields are rejected.
- New/non-empty changed notes require `notes_action: "append_signature"` and an
  active employee password. `notes_action: "clear"` clears notes without a password.
  Passwords attribute the action to an employee; they do not create a login session.
- Setting a hold requires a valid employee every time, including repeated dates,
  and appends `Hold till MM-DD-YYYY (NAME, MM-DD-YYYY)`. Clearing a hold needs no
  password and preserves notes. API dates remain `YYYY-MM-DD`; the frontend's
  today-or-later restriction is not enforced by the backend. Submit hold changes
  separately from manual notes changes.
- Changing `is_active` requires an employee and appends `Deactivated client (...)`
  or `Reactivated client (...)` with an MM-DD-YYYY action date. Unchanged status
  does not add a signature. Clients remain searchable and existing tickets remain.
  Ticket issuance is blocked in the current ticket backend: Pawn, Sell, Convert,
  Transfer (either party), and Repawn. These ticket operations still run in main.

Sources: `CreateClientDto` / `UpdateClientDto` in [dto/](src/client/dto/),
`ClientService.create/update`, `EmployeeRepository.findActiveByPassword` in
[employee.repository.ts](src/employees/employee.repository.ts),
`ClientImageService.save`, `ClientHoldDialog.save` in
[ClientHoldDialog.tsx](../frontend/src/modules/clients/components/ClientHoldDialog.tsx),
and `ticketService.createPawnTicket/createSellTicket/convertTicket/transferTicket`
in [ticket.service.ts](../electron/src/main/modules/tickets/ticket.service.ts).

### Remaining work

| Area                          | Current implementation                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Imported legacy photo display | Server resolve supports imported paths, but renderer getImageUrl still chooses the Electron image protocol for them |

Source: `getImageUrl` in [imageUrl.ts](../frontend/src/shared/utils/imageUrl.ts).
Client/reference APIs now use HTTP; imported legacy photo display remains on the
Electron image protocol.

## Verification

Run from `server/`:

```bash
npm test -- src/client src/reference
npm run build
```

Client and reference HTTP tests run real Nest routes and implementation code with a mocked
PostgreSQL connection; they are not live-database integration tests. See
`describe` in [client.http.spec.ts](src/client/client.http.spec.ts).
`ReferenceController` / `ReferenceRepository` tests in
[src/reference/reference.http.spec.ts](src/reference/reference.http.spec.ts) cover
response shapes, SQL ordering and active-color filtering, empty results, and database failures.
`ClientService`, repository and image service tests cover isolated behavior.
The root `scripts/clientActivation.test.cjs` also checks ticket restrictions.

The full `npm test` currently includes an unrelated starter test:
`AppController.getHello` returns `Hello, guest!`, while
[src/app.controller.spec.ts](src/app.controller.spec.ts) expects `Hello World!`.
