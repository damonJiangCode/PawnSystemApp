# Client API

C = `ClientController` ([controller](client.controller.ts)),
S = `ClientService` ([service](client.service.ts)),
R = `ClientRepository` ([repository](client.repository.ts)).
Image operations use `ClientImageService` ([image service](client-image.service.ts)).

## Endpoints

| Endpoint                    | Parameters                                                                                            | C → S → R                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET /client                 | query: firstName?, lastName?; max 20 characters each                                                  | search → search → searchByName                                                                                                    |
| GET /client/by-dob          | query: dateOfBirth, valid YYYY-MM-DD                                                                  | searchByDob → searchByDob → searchByDob                                                                                           |
| POST /client                | body: { client, identifications, photo, employee_password?, notes_action? }                           | create → create → create, insertIds; image service save                                                                           |
| PATCH /client/:clientNumber | positive integer path; body: { client?, identifications?, photo?, employee_password?, notes_action? } | update → update → loadForUpdate, update; deleteIds + insertIds when replacing IDs, otherwise loadIds; optional image service save |
| GET /client/images          | query: path                                                                                           | loadImage → image service resolve → file; no repository                                                                           |

Searches return `Client[]`; POST returns 201 with a `Client`; PATCH returns 200
with a `Client`. Responses include identifications; `mapRowToClient` in
[client.mapper.ts](client.mapper.ts) defines the shape.

## Inputs and rules

- `client`: required POST fields are first_name, last_name, date_of_birth, gender,
  hair_color, eye_color, height_cm, weight_kg, address, city, province and country.
  Optional fields: middle_name, postal_code, email, phone, notes, pickup_self_only.
  PATCH also accepts is_active and hold_until. See [CreateClientDetailsDto](dto/create-client.dto.ts)
  and [UpdateClientDetailsDto](dto/update-client.dto.ts).
- `identifications`: 2–20 `{ id_type, id_value }` objects. Required for POST;
  supplied IDs replace the set during PATCH. `photo`: `{ fileName, base64 }`,
  raw base64 PNG/JPEG up to 5 MB; the server chooses the UUID filename.
- `ClientService.search` trims names and returns [] when both are empty.
  `ClientRepository.searchByName` matches case-insensitive literal prefixes;
  searchByDob matches the exact date. Both include deactivated clients.
- `ClientService.create/update` enforce age 18 or older using America/Regina.
  PATCH preserves omitted values; `""` clears optional text. Only hold_until
  accepts null. Unknown fields and server-owned statistics/timestamps are rejected
  by `ClientController` validation.
- `ClientService.update` supports notes-only updates. Non-empty changed notes
  require notes_action=append_signature and employee_password; clear/empty notes
  need no password. Notes actions are keep, clear and append_signature.
- Setting hold_until (YYYY-MM-DD) requires an employee and appends a signed
  `Hold till MM-DD-YYYY (...)` entry, even for repeated dates. Null clears it
  without changing notes or requiring a password. Submit manual notes separately.
- Changing is_active requires an employee and appends `Deactivated client (...)`
  or `Reactivated client (...)`; unchanged status adds no entry. Dates in these
  automatic entries use MM-DD-YYYY. New clients default to active with no hold.
- `ClientService.create/update` save related records in one transaction;
  update locks the client row. Password checks use
  `EmployeeRepository.findActiveByPassword` in [employee.repository.ts](../employee/employee.repository.ts)
  for attribution, not a login session. Invalid input/password: 400; missing
  client/image: 404. Password errors include field=employee_password.
- No DELETE, PUT, separate hold/status route or standalone photo-upload route.

## ID type availability

- ClientService.create/update validate type availability through
  ClientRepository.loadIdTypeStates on the same transaction connection.
- New IDs need an active exact type name from the reference API. An update may
  retain existing inactive type/number pairs unchanged, but cannot add, change or
  duplicate them beyond their original count. Invalid IDs return 400 with
  field=identifications, before photos or record writes.
- Omitted IDs remain untouched. Type reads use FOR SHARE locks, preventing a
  concurrent reference deactivation until the client transaction completes.

## Tests

Run from `server/`: `npm test -- src/client`.

- [client.service.spec.ts](client.service.spec.ts): searches, age, signatures,
  partial updates, hold/status rules, rollback and photo cleanup.
- [client.repository.spec.ts](client.repository.spec.ts): parameterized writes,
  batch ID insertion and row locks.
- [client.http.spec.ts](client.http.spec.ts): routing, DTO validation, responses,
  create/PATCH flows, photos and employee errors with mocked PostgreSQL.
- [client-image.service.spec.ts](client-image.service.spec.ts): image validation,
  UUID storage, path restrictions and cleanup using temporary files.

These tests do not run against the live database.
