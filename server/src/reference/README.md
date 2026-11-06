# Reference API

Lookup data shared by the business modules. Each resource has its own folder with a
controller, service, repository, DTOs and specs. Paths below start with `/reference`.

## Routes

| Resource           | Routes                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Cities             | `GET /cities`                                                                                                         |
| ID types           | `GET /id-types`, `GET /id-types/all`, `POST /id-types`, `PATCH /id-types/activate`, `PATCH /id-types/deactivate`      |
| Colors             | `GET /colors/:kind`, `GET /colors/:kind/all`, `POST /colors/:kind`, `PATCH /colors/:kind/activate`, `.../deactivate`  |
| Locations          | `GET /locations`, `GET /locations/all`, `POST /locations`, `PATCH /locations/activate`, `PATCH /locations/deactivate` |
| Holidays           | `GET /holidays`, `POST /holidays`, `DELETE /holidays/:holidayDate`                                                    |
| Item categories    | `GET /item-categories`, `GET /item-categories/all`, `POST /item-categories`, `PATCH /item-categories/:categoryId`     |
| Item subcategories | `POST /item-subcategories`, `PATCH /item-subcategories/:subcategoryId`                                                |

`:kind` must be `hair` or `eye`; any other value returns 400.

## Shared behavior

- Plain `GET` routes return active values only, for dropdowns. `/all` also returns inactive
  values, active first.
- Records are deactivated, not deleted, so existing clients and tickets keep their values.
  Holidays are the exception: they can be deleted, with confirmation in the UI.
- There are no rename routes.
- Status codes: invalid input 400, missing record 404, duplicate or already in that state 409.
  Item categories are the exception: a repeated PATCH returns 200.
- Duplicate checks include inactive records. Inserts use `ON CONFLICT DO NOTHING`, so
  concurrent duplicates are handled by the database.

## Resource rules

- **Cities:** `{ provinces, citiesByProvince }`.
- **ID types:** names keep their casing and punctuation. Duplicates are case-insensitive,
  through a unique index on `LOWER(type)`.
- **Colors:** trimmed and uppercased. Table names come only from the validated `kind`;
  values are SQL parameters.
- **Locations:** a two-letter, two-digit code such as `AB12`, plus a description. Activation
  also accepts existing special codes such as `UNKNOWN`.
- **Holidays:** dates are `YYYY-MM-DD` calendar strings with no time zone conversion. A
  date can only appear once. Past dates are allowed.
- **Item categories:** the plain GET returns a flat list of active category and subcategory
  pairs; `/all` returns nested records. A new subcategory needs an existing, active parent
  (404 missing, 409 inactive). Parent and child flags change independently, and a child is
  selectable only when both are active. Names are unique ignoring case and outer spaces.

## Tests

From `server/`: `npm test -- src/reference`. Each resource has HTTP specs with a mocked
PostgreSQL pool, and most have service specs. The frontend adapters have matching
`*.http.test.ts` files in `frontend/src/shared/api/`.
