# Reference API

- C: [ReferenceController](reference.controller.ts) for all reference routes.
- S: [ReferenceService](reference.service.ts), used by every reference endpoint.
- R: [ReferenceRepository](reference.repository.ts), injected with the shared pool.

## Endpoints

All paths start with `/client/reference`. Body means JSON `{ "color": "BROWN" }`.

| Method + path                 | Params | C → S → R                                                                         |
| ----------------------------- | ------ | --------------------------------------------------------------------------------- |
| GET /cities                   | None   | loadCities → S.loadCities → R.loadCities                                          |
| GET /id-types                 | None   | loadIdTypes → S.loadIdTypes → R.loadIdTypes                                       |
| GET /hair-colors              | None   | loadHairColors → S.loadColors('hair') → R.loadColors('hair')                      |
| GET /eye-colors               | None   | loadEyeColors → S.loadColors('eye') → R.loadColors('eye')                         |
| GET /hair-colors/all          | None   | loadAllHairColors → S.loadAllColors('hair') → R.loadAllColors('hair')             |
| GET /eye-colors/all           | None   | loadAllEyeColors → S.loadAllColors('eye') → R.loadAllColors('eye')                |
| POST /hair-colors             | Body   | addHairColor → S.addColor → R.addColor                                            |
| POST /eye-colors              | Body   | addEyeColor → S.addColor → R.addColor                                             |
| PATCH /hair-colors/activate   | Body   | activateHairColor → S.setColorActive → R.setColorActive; R.findColor on failure   |
| PATCH /hair-colors/deactivate | Body   | deactivateHairColor → S.setColorActive → R.setColorActive; R.findColor on failure |
| PATCH /eye-colors/activate    | Body   | activateEyeColor → S.setColorActive → R.setColorActive; R.findColor on failure    |
| PATCH /eye-colors/deactivate  | Body   | deactivateEyeColor → S.setColorActive → R.setColorActive; R.findColor on failure  |

## ID types

All paths use `/client/reference` and the existing Reference C → S → R classes.

| Method + path              | Parameters              | C → S → R                                                                          |
| -------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| GET /id-types              | None; active names only | loadIdTypes → loadIdTypes → loadIdTypes                                            |
| GET /id-types/all          | None; names and states  | loadAllIdTypes → loadAllIdTypes → loadAllIdTypes                                   |
| POST /id-types             | body: { type }          | addIdType → addIdType → addIdType                                                  |
| PATCH /id-types/activate   | body: { type }          | activateIdType → setIdTypeActive(true) → setIdTypeActive; findIdType on failure    |
| PATCH /id-types/deactivate | body: { type }          | deactivateIdType → setIdTypeActive(false) → setIdTypeActive; findIdType on failure |

- GET `/id-types` returns `string[]`; `/all` returns `{ type, is_active }[]`,
  active first then name. POST returns 201 with the active record; PATCH returns 200.
- `IdTypeDto` trims names, requires a non-empty string up to 500 characters and
  rejects unknown fields. Names retain their casing and punctuation.
- Duplicate names are case-insensitive, including inactive types: 409. A unique
  index on `LOWER(type)` handles concurrent duplicates; inserts use
  `ON CONFLICT DO NOTHING`. State lookups are case-insensitive and return the stored label.
- Invalid input: 400; missing type: 404; already in the requested state: 409;
  database failure: 500. No delete or rename route. Existing client references remain.
- Frontend Reference → ID Types lists/searches all types, adds new names, activates
  inactive types and confirms deactivation. It uses the client appAPI HTTP adapter.
- Client writes also enforce type states: new IDs require an active exact returned
  type name; PATCH can retain an existing inactive `(id_type, id_value)` pair,
  including its original multiplicity. New/changed/copied inactive IDs are rejected.
  Omitted IDs remain untouched. Type rows use `FOR SHARE` locks in the client
  transaction so deactivation cannot race the validation and subsequent inserts.

## Locations

These routes also live in ReferenceController under `/client/reference`.

| Method + path               | Params                          | C → S → R                                                                                  |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| GET /locations              | None                            | loadLocations → loadLocations → loadLocations                                              |
| GET /locations/all          | None                            | loadAllLocations → loadAllLocations → loadAllLocations                                     |
| POST /locations             | body: { location, description } | addLocation → addLocation → addLocation                                                    |
| PATCH /locations/deactivate | body: { location }              | deactivateLocation → setLocationActive(false) → setLocationActive; findLocation on failure |
| PATCH /locations/activate   | body: { location }              | activateLocation → setLocationActive(true) → setLocationActive; findLocation on failure    |

- GET `/locations` returns active codes (`string[]`), sorted by code. `/all`
  returns `{ location, description, is_active }[]`, active first, then by code.
- POST returns 201 with the saved record; PATCH returns 200 with the updated record.
- `CreateLocationDto` in [location.dto.ts](dto/location.dto.ts) requires a
  two-letter/two-digit code (AB12) and a string description (empty is allowed,
  max 1000 characters after trimming). The service uppercases codes and trims text.
- `LocationDto` validates a non-empty code for activation/deactivation, allowing existing
  special codes such as UNKNOWN. Unknown body properties are rejected.
- Duplicate codes, including inactive ones: 409. Missing code: 404. Already
  in the requested state: 409. Invalid input: 400. Database failure: 500.
- Inserts use `ON CONFLICT DO NOTHING`; state changes atomically update rows in the opposite state only. SQL values are parameters. No delete or rename route.
  Deactivation retains existing ticket references and descriptions.
- `appAPI.ticket.activateLocation/deactivateLocation` use HTTP through `getAppApi()`.
  Inactive rows offer Activate; saved state and list ordering update after success.
  Deactivation retains its confirmation dialog. Old location preload methods,
  IPC handlers/channels, Electron service methods and repository are removed.

## Holidays

Routes use the same `/client/reference` prefix and Reference C → S → R classes.

| Method + path                 | Parameters                               | C → S → R                                                 |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| GET /holidays                 | None                                     | loadHolidayDates → loadHolidayDates → loadHolidayDates    |
| POST /holidays                | body: { holiday_date: YYYY-MM-DD, name } | addHolidayDate → addHolidayDate → addHolidayDate          |
| DELETE /holidays/:holidayDate | path: YYYY-MM-DD                         | deleteHolidayDate → deleteHolidayDate → deleteHolidayDate |

- GET returns 200 with all `{ holiday_date, name }` records sorted by date.
  Dates remain calendar strings, with no timezone conversion. The existing UI
  continues filtering by year.
- POST returns 201 with the saved record. DTOs in [holiday.dto.ts](dto/holiday.dto.ts)
  trim inputs, require a real YYYY-MM-DD date (year 0001–9999), a non-empty string
  name, and reject unknown body fields. Past dates are allowed.
- Duplicate dates: 409, even with a different name; identical names on different
  dates are allowed. Inserts use `ON CONFLICT DO NOTHING`.
- DELETE returns 200 with the removed record; a missing date returns 404.
  This is a real deletion, matching the existing behavior, with frontend confirmation.
- Invalid inputs: 400; database failures: 500. SQL values are parameters and date
  results use `holiday_date::text`. No update or activation endpoints.
- Existing `appAPI.ticket.loadHolidayDates/addHolidayDate/deleteHolidayDate` now
  use HTTP. The old Electron Holiday service, repository, preload methods and
  IPC handlers/channels are removed. CORS allows DELETE requests from configured origins.

## Color and dropdown behavior

- GET returns 200: cities use `{ provinces, citiesByProvince }`; active ID types and active
  colors use `string[]`; color `/all` uses `{ color, is_active }[]`, active first.
- POST returns 201 with `{ color }`; PATCH returns 200 with `{ color, is_active }`.
  The renderer adapter keeps the existing appAPI.addHairColor/addEyeColor string result.
- `ColorDto` in [color.dto.ts](dto/color.dto.ts) requires a non-empty string up to
  500 characters and rejects unknown fields. S trims and uppercases colors.
- Duplicate colors (including inactive ones): 409. Missing colors: 404.
  Already active/inactive: 409. Invalid input: 400. Database errors: 500.
- R.addColor uses `ON CONFLICT DO NOTHING` to handle concurrent duplicate inserts.
  R.setColorActive atomically updates only the opposite state. User values are SQL parameters;
  table names come only from internal hair/eye choices. No DELETE or rename route.
- Existing table data, customer references and seed definitions are preserved.
  Inactive colors remain visible in complete reference lists but disappear from new dropdown queries.
- All client/reference appAPI methods now use HTTP; their old preload/main handlers are removed.

## Tests

- From `server/`: `npm test -- src/reference`.
- [reference.http.spec.ts](reference.http.spec.ts): dropdown shapes, ordering,
  active-color filters, empty results, database errors and absent DELETE routes.
- [reference.service.spec.ts](reference.service.spec.ts): normalization, duplicates,
  state errors and database failure propagation.
- [color.http.spec.ts](color.http.spec.ts): both color types through real Nest routes,
  DTOs, service and repository with mocked PostgreSQL; add/deactivate/reactivate,
  duplicate inactive colors, 400/404/409 responses and parameterized SQL.
- Renderer `client.http.test.ts`: HTTP paths, JSON payloads, preserved appAPI return
  shapes and error messages. No test writes to the live database.
- [location.http.spec.ts](location.http.spec.ts): real Reference routes, DTOs,
  service and repository with mocked PostgreSQL; normalization, SQL parameters,
  lists, activation/deactivation, legacy codes, validation and 400/404/409/500 responses.
- `reference.service.spec.ts` also checks location normalization, duplicates,
  state distinctions and database failure propagation.
- Frontend `location.http.test.ts`: HTTP paths, methods, payloads, errors and
  actual `getAppApi()` binding while preserving other desktop ticket methods.

- [holiday.http.spec.ts](holiday.http.spec.ts): real Reference routes and DTOs with
  mocked PostgreSQL; date-only responses, ordering, create/delete, duplicate dates,
  leap years, invalid fields/dates and 400/404/409/500 responses.
- `reference.service.spec.ts` also checks holiday normalization, duplicates,
  missing records and database failure propagation.
- Frontend `holiday.http.test.ts`: GET/POST/DELETE paths, payloads, safe path
  encoding, date strings, errors and `getAppApi()` bindings.

- ID type reads filter `is_active = TRUE`. Client edit retains an existing
  unavailable type without offering it on new ID rows. Historical-only types stay
  stored for old records.

- [id-type.http.spec.ts](id-type.http.spec.ts): real Reference routes and DTOs with
  mocked PostgreSQL, name preservation, case-insensitive conflicts, state changes,
  unknown fields, Unicode, error responses and absent delete/rename routes.
- Client service/HTTP tests cover new inactive/unknown IDs, historical inactive
  preservation, changed/duplicated inactive IDs, rollback and unchanged partial PATCH.
- Frontend `id-type.http.test.ts` checks requests, response shapes, errors and
  appAPI bindings; no live database writes are made by these tests.
