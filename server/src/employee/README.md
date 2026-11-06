# Employee API

Employee administration. The module also exports `EmployeeRepository`, which other modules
use to resolve a PIN to an employee. Unknown fields return 400.

| Endpoint                       | Input                                | Success          |
| ------------------------------ | ------------------------------------ | ---------------- |
| GET /employees                 | Query: `first_name?`, `last_name?`   | 200 `Employee[]` |
| POST /employees                | `CreateEmployeeDto`                  | 201 `Employee`   |
| PUT /employees/:employeeNumber | `UpdateEmployeeDto`; number 1–2^31−1 | 200 `Employee`   |

- Search matches partial names case-insensitively. With no filter it lists everyone,
  including terminated employees.
- PUT replaces the whole record, so omitted `nickname`, `address`, `phone` and `email`
  become `""`. Omit `password` to keep the current PIN.
- Responses never include `pin_hash`.
- Every create and update needs a manager password.

## Errors

| Status | field              | Message                                  |
| ------ | ------------------ | ---------------------------------------- |
| 400    | none               | DTO validation messages                  |
| 403    | `manager_password` | Manager password is incorrect.           |
| 404    | `form`             | No employee was found for that number.   |
| 409    | `password`         | Password is already in use.              |
| 409    | `form`             | At least one active manager is required. |

## PINs and concurrency

- PINs are stored as HMAC-SHA256(`EMPLOYEE_PIN_SECRET`, trimmed PIN), matching
  [employee-pin.cjs](../../../database/migration/scripts/employee-pin.cjs). A keyed hash is
  used instead of bcrypt because employees are identified by PIN alone, which needs lookup by value.
- The `employee_pin_hash_key` constraint enforces uniqueness (a violation returns 409).
- Updates lock all active managers in number order before the target row, so two
  concurrent demotions cannot remove the last manager or deadlock.

Tests: [employee.http.spec.ts](employee.http.spec.ts) and
[employee-pin.hasher.spec.ts](employee-pin.hasher.spec.ts).
