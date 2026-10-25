# Reference API

Read-only dropdown data from existing PostgreSQL tables. No seed data is written.

C = `ReferenceController` ([controller](reference.controller.ts)),
R = `ReferenceRepository` ([repository](reference.repository.ts)).
No service layer: these queries have no separate business rules.

## Endpoints

All endpoints take no parameters and return HTTP 200 on success.

| Endpoint                          | Response                                                            | C → R (S omitted)                   |
| --------------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| GET /client/reference/cities      | { provinces: string[], citiesByProvince: Record<string, string[]> } | loadCities → loadCities             |
| GET /client/reference/id-types    | string[]                                                            | loadIdTypes → loadIdTypes           |
| GET /client/reference/hair-colors | string[]                                                            | loadHairColors → loadColors('hair') |
| GET /client/reference/eye-colors  | string[]                                                            | loadEyeColors → loadColors('eye')   |

`ReferenceRepository.loadCities` returns distinct cities grouped by province.
loadIdTypes reads id_type; loadColors reads hair_color or eye_color and includes
only is_active=true options. All queries are sorted. No results produce empty
arrays (and an empty citiesByProvince object for cities); database errors return
500 rather than a successful empty list. `ReferenceModule` in
[reference.module.ts](reference.module.ts) imports the shared database pool.

Color administration (list all/add/activate/deactivate) is outside this module.

## Tests

Run from `server/`: `npm test -- src/reference`.

[reference.http.spec.ts](reference.http.spec.ts) exercises real Nest routes and
repository code with mocked PostgreSQL: city grouping, ID lists, active-color
SQL filters, sorting, empty results, database failures and absent write routes.
It does not query or modify the live database.
