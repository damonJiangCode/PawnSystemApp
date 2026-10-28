# Reference Module

- Owns reference-data screens: hair/eye colors, holidays, locations, ID types and item categories.
- `colors/`, `holiday/`, `location/`, `id-types/` group their components and dialogs.
- ID types support active/full lists, creation and activation/deactivation. Names
  remain stable so existing client records keep their type labels.
- Colors, locations, holidays and ID types use HTTP → ReferenceController → ReferenceService → ReferenceRepository.
- `loadAll…` means a complete list, including inactive values. Ordinary lists
  contain only active values where applicable. These names do not imply permissions.
- Employees belong to the separate employee module.

- Item category/subcategory options use `GET /client/reference/item-categories`
  through `appAPI.item.loadItemCategories`. The item picker keeps its existing UI
  and preload cache. New selections contain active parents and children only.
- Adapter tests cover HTTP routing, preserving other item methods, empty results
  and HTTP/connection errors. The old category-read Electron handler is removed.

- Reference → Item Categories (`item-categories/`) lists every category with its
  subcategories, active first then by name, and searches both names. "Add
  Category" creates only a category, then offers to add its first subcategory;
  each active category has "Add Subcategory". Parents and children are
  activated/deactivated separately; deactivation is confirmed. It uses the
  HTTP-backed `appAPI.item` methods `loadAllItemCategories`, `addItemCategory`,
  `addItemSubcategory`, `setItemCategoryActive` and `setItemSubcategoryActive`.
- The item picker caches active options per window, so open windows show
  changes after the app restarts.
