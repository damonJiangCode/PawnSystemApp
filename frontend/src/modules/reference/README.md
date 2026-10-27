# Reference Module

- Owns reference-data screens: hair/eye colors, holidays, locations and ID types.
- `colors/`, `holiday/`, `location/`, `id-types/` group their components and dialogs.
- ID types support active/full lists, creation and activation/deactivation. Names
  remain stable so existing client records keep their type labels.
- Colors, locations, holidays and ID types use HTTP → ReferenceController → ReferenceService → ReferenceRepository.
- `loadAll…` means a complete list, including inactive values. Ordinary lists
  contain only active values where applicable. These names do not imply permissions.
- Employees belong to the separate employee module.
