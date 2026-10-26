# Employees Module

`employees/` owns employee admin UI and employee renderer API calls.

## Structure

```text
employees/
  employee.api.ts
  admin/
    EmployeeAdminWindow.tsx
    EmployeeAddEditDialog.tsx
```

## Responsibilities

This module owns:

- employee search
- employee create/update
- employee admin window
- employee edit dialog

Password checks used by ticket/client workflows are handled through main ticket
or client behavior when needed.

## Main Flow

```text
EmployeeAdminWindow
  -> employee.api.ts
  -> preload
  -> employee.handlers.ts
  -> employee.service.ts
  -> employee.repo.ts
```

## Review Notes

When reviewing this module, check:

- terminated employees cannot perform restricted actions if that rule is active
- employee number and password behavior matches business expectations
- unknown/default employee migration data does not break editing
