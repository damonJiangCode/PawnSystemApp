# Reference Module

- Owns reference-data screens: hair/eye colors, holidays and locations.
- `colors/`, `holiday/`, `location/` group their components and dialogs.
- ID types are reference data too; their existing read API supplies client forms.
- Colors and locations use HTTP → ReferenceController → ReferenceService → ReferenceRepository.
- Holidays currently use ticket.api → preload → ticketReferenceService → repository;
  their HTTP implementation is still pending.
- `loadAll…` means a complete list, including inactive values. Ordinary lists
  contain only active values where applicable. These names do not imply permissions.
- Employees belong to the separate employee module.
