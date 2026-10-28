# Reference Module

- Owns lookup data: cities, ID types, hair/eye colors, locations, holidays and
  item categories. `colors/`, `holiday/`, `location/`, `id-types/` and
  `item-categories/` hold the management windows and dialogs.
- [reference.api.ts](reference.api.ts) exports `referenceApi`, the only wrapper for
  lookup data. Management windows and business screens (client dialogs, ticket
  dialogs, payment, overdue report, item pickers) all use it. It trims input,
  uppercases color and location codes, and calls `getAppApi().reference`.
- `getAppApi().reference` is built by `createReferenceHttpApi()` in
  [src/shared/api/reference.http.ts](../../shared/api/reference.http.ts) and calls
  `/reference/...` on the NestJS server. Contract:
  [referenceApi.contract.ts](../../../../shared/api-contracts/referenceApi.contract.ts);
  payload types: [reference.contract.ts](../../../../shared/payload-contracts/reference.contract.ts).
- `loadAll…` returns a complete list including inactive values. Ordinary lists
  contain only active values. These names do not imply permissions.
- ID types support active/full lists, creation and activation/deactivation. Names
  remain stable so existing client records keep their type labels.
- `referenceApi.preloadItemCategories()` loads active category/subcategory pairs
  once per window for item pickers; open windows show changes after a restart.
- Reference → Item Categories lists every category with its subcategories, active
  first then by name, with collapsible rows and search across both names. "Add
  Category" creates only a category, then offers to add its first subcategory;
  each active category has "Add Subcategory". Parents and children are
  activated/deactivated separately; deactivation is confirmed.
- Employees belong to the separate employee module.
- Tests in `src/shared/api/`: `reference.http.test.ts` (cities, colors, lists,
  `getAppApi` domains), `id-type`, `location`, `holiday` and `item-category`
  `.http.test.ts` (routes, bodies, errors and `getAppApi().reference` bindings).
