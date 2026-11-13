# Report API

Read-only reports. Every route is a GET with query parameters. Unknown parameters return 400.

| Endpoint              | Query                                              | Success                |
| --------------------- | -------------------------------------------------- | ---------------------- |
| GET /reports/daily    | `from_date`, `to_date`                             | 200 tickets with items |
| GET /reports/buyback  | `from_date`, `to_date`                             | 200 picked-up tickets  |
| GET /reports/interest | `from_date`, `to_date`                             | 200 interest payments  |
| GET /reports/overdue  | `due_on_or_before`, `location_from`, `location_to` | 200 tickets with items |

## Dates

- Dates are `YYYY-MM-DD` shop days in `America/Regina`. Both ends of a range are inclusive.
  The database runs in UTC, so a day is bounded by Regina midnight, not UTC midnight.
- A range must have To ≥ From and cover less than one year.
- Instants (`pickup_datetime`, `payment_datetime`) are returned as ISO strings. Day-only values
  (`transaction_date`, `due_date` in overdue) are Regina days as `YYYY-MM-DD`.
- Money is rounded to cents.

## Interest

`interest_payment` is written only by this system, so it has no rows before the first payment.
The response includes `records_start_date`, the Regina day of the first recorded payment (`null`
when there is none), and `records_note`, which the window shows as-is: it explains that the range
starts before the first payment, or that no payment exists yet (`null` otherwise).

## Overdue

Pawned tickets due on or before the day, skipping clients whose `hold_until` is on or after it.
Both locations must exist in the `location` table. Codes are compared in uppercase.

| Location shape       | Example       | Range rule                                           |
| -------------------- | ------------- | ---------------------------------------------------- |
| Letters + number     | `AB11`–`AC43` | Ordered by (letters, number); may cross letter codes |
| Letters-dash-letters | `RR-A`–`RR-Z` | Ordered by (prefix, suffix)                          |
| Any other code       | `AK`          | Only on its own: From = To                           |

The two range shapes cannot be mixed in one request.

## Errors

| Status | field                         | Message                                                     |
| ------ | ----------------------------- | ----------------------------------------------------------- |
| 400    | the parameter                 | DTO validation messages, such as `Enter a valid From date.` |
| 400    | `to_date`                     | `To date must be the same as or later than From date.`      |
| 400    | `to_date`                     | `Date range cannot exceed 1 year.`                          |
| 400    | `location_from`/`location_to` | `Select a From/To location from the list.`                  |
| 400    | `location_to`                 | Mixed shapes, a code that must be alone, or To before From  |

Tests: [report.http.spec.ts](report.http.spec.ts).
