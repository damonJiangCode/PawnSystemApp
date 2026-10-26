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
| GET /hair-colors/all          | None   | loadHairColorsForAdmin → S.loadAllColors('hair') → R.loadAllColors('hair')        |
| GET /eye-colors/all           | None   | loadEyeColorsForAdmin → S.loadAllColors('eye') → R.loadAllColors('eye')           |
| POST /hair-colors             | Body   | addHairColor → S.addColor → R.addColor                                            |
| POST /eye-colors              | Body   | addEyeColor → S.addColor → R.addColor                                             |
| PATCH /hair-colors/activate   | Body   | activateHairColor → S.setColorActive → R.setColorActive; R.findColor on failure   |
| PATCH /hair-colors/deactivate | Body   | deactivateHairColor → S.setColorActive → R.setColorActive; R.findColor on failure |
| PATCH /eye-colors/activate    | Body   | activateEyeColor → S.setColorActive → R.setColorActive; R.findColor on failure    |
| PATCH /eye-colors/deactivate  | Body   | deactivateEyeColor → S.setColorActive → R.setColorActive; R.findColor on failure  |

## Behavior

- GET returns 200: cities use `{ provinces, citiesByProvince }`; ID types and active
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
  Inactive colors remain visible in admin lists but disappear from new dropdown queries.
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
