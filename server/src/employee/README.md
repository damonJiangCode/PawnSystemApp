# Employee API

[EmployeeModule](employee.module.ts) serves employee administration under
`/employees` and exports `EmployeeRepository` for PIN attribution in other modules
(client notes, holds and status changes). Controller → service → repository, with
`strictValidationPipe`: unknown fields are rejected with 400.

| Method + path                  | Input                                | Success          | C → S → R                                                                                |
| ------------------------------ | ------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| GET /employees                 | Query: `first_name?`, `last_name?`   | 200 `Employee[]` | search → search → search                                                                 |
| POST /employees                | `CreateEmployeeDto`                  | 201 `Employee`   | create → create → findActiveManagerByPassword, create                                    |
| PUT /employees/:employeeNumber | `UpdateEmployeeDto`; number 1–2^31−1 | 200 `Employee`   | update → update → findActiveManagerByPassword, lockActiveManagers, loadForUpdate, update |

- Search matches partial names case-insensitively (`%` and `_` are escaped), sorted
  by last name, first name, number. No filters lists everyone, including terminated.
- PUT replaces the whole record: omitted `nickname`, `address`, `phone`, `email`
  become `""`. Omit `password` to keep the current PIN.
- DTO rules ([employee.dto.ts](employee.dto.ts)): names and nickname are trimmed
  and uppercased; first/last name required; `date_of_birth` is a real
  `YYYY-MM-DD` date; `gender` is `male`, `female` or `unknown`; both flags are
  required booleans; `password` (create) and `manager_password` are 1–20 trimmed
  characters.
- Responses never include `pin_hash`; `date_of_birth` is returned as `YYYY-MM-DD`.

## Errors

Business errors use `{ field, message }` so the form can focus the field.

| Status | field              | message                                  |
| ------ | ------------------ | ---------------------------------------- |
| 400    | —                  | class-validator messages (DTO rules)     |
| 403    | `manager_password` | Manager password is incorrect.           |
| 404    | `form`             | No employee was found for that number.   |
| 409    | `password`         | Password is already in use.              |
| 409    | `form`             | At least one active manager is required. |

## PINs and concurrency

- [EmployeePinHasher](employee-pin.hasher.ts) stores HMAC-SHA256(`EMPLOYEE_PIN_SECRET`,
  trimmed PIN), the same algorithm as
  [employee-pin.cjs](../../../database/migration/scripts/employee-pin.cjs). The
  server fails to start without a secret of at least 32 characters.
- A keyed hash, not bcrypt: the workflow identifies an employee by PIN alone, which
  needs lookup by value. PIN uniqueness relies on the `employee_pin_hash_key`
  constraint (unique violation → 409), not a check-then-insert.
- Create and update run in one transaction. Update locks all active managers
  (ordered by number) before the target row, so two concurrent demotions cannot
  remove the last manager and lock order cannot deadlock.
- Manager passwords authorize one action; there is no login session yet, and GET
  is not protected (LAN-only deployment until auth is added).

Tests: [employee.http.spec.ts](employee.http.spec.ts) (routes, validation, status
codes, transactions, lock order, hashing; mocked pool) and
[employee-pin.hasher.spec.ts](employee-pin.hasher.spec.ts) (parity with the
migration script, secret check).
