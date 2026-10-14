# Employee Migration

Generated: 2026-10-14T02:04:08.433Z

Source: `EM200EMPLOYEE` in `superpawnconv.mdb`

Target database: `pawnsystemdb`

Mode: commit

## Summary

| Metric | Count |
| --- | ---: |
| Legacy employee rows | 101 |
| Employees prepared | 102 |
| Terminated employees | 16 |
| Managers | 1 |
| Default DOB rows | 3 |
| Employees with address | 77 |
| Employees with phone | 85 |
| Employees with email | 39 |

## Rules

- Add placeholder employee `999 / Legacy Employee` for legacy tickets that used employee number 999.
- Set `gender` to `unknown` because the legacy employee table has no gender column.
- Set missing or invalid birth dates to `1900-01-01`.
- Map `EM200Terminated = 1` to `is_terminated = true`; terminated employee passwords cannot authorize app actions.
- Set employee `69 / WEI FENG` as manager.
- No employee photo field is migrated because `EM200PICTURE` has no usable photo rows.
- After commit, ticket `employee_name` placeholders are backfilled from migrated employee nicknames.
