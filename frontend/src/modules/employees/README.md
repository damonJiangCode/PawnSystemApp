# Employees Module

`employees/` owns the employee admin UI (Admin → Employees) and its renderer API.

## Structure

```text
employees/
  employee.api.ts
  admin/
    EmployeeAdminWindow.tsx
    EmployeeAddEditDialog.tsx
```

## Main Flow

```text
EmployeeAdminWindow / EmployeeAddEditDialog
  -> employee.api.ts (employeeApi)
  -> getAppApi().employee
  -> src/shared/api/employee.http.ts (createEmployeeHttpApi)
  -> NestJS GET /employees, POST /employees, PUT /employees/:employeeNumber
```

- The server trims, uppercases and validates; `employee.api.ts` only forwards.
- `employee.http.ts` sends only editable fields, omits a blank password on update
  (keeps the current PIN) and converts `created_at`/`updated_at` to `Date`.
- Failed saves reject with an `Error` whose `field` (`password`,
  `manager_password` or `form`) lets the dialog focus the right input. DTO
  validation errors have no field and appear as the form message.
- Every create/update needs a manager password. Employee PINs are stored only as
  `pin_hash`; see [server/src/employee/README.md](../../../../server/src/employee/README.md).
- Every PIN check (client notes and holds, tickets) runs on the server.

Tests: [employee.http.test.ts](../../shared/api/employee.http.test.ts) (query
string, bodies, PUT/blank password, field errors, `getAppApi` binding).

## Review Notes

- terminated employees cannot authorize actions (their PINs no longer match)
- at least one active manager must remain (enforced by the server)
- legacy migration data (unknown gender, default birth date) must stay editable
