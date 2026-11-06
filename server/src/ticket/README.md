# Ticket API

Every ticket workflow, plus the ticket money and date rules.

- `TicketService`: lookups, pawn, sell, edit, convert, transfer.
- `TicketPaymentService`: pickups and extensions.
- `TicketStatusService`: expire, stolen, reverse.
- [ticket-finance.ts](ticket-finance.ts): the authoritative money and date calculations.

Writes run in one transaction, locking the ticket first and then clients in number order.

## Routes

| Endpoint                                    | Input                                                                          | Success                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| GET /tickets                                | Query: `client_number`                                                         | 200 `Ticket[]`                            |
| GET /tickets/:ticketNumber                  | Path number                                                                    | 200 `{ ticket, client }`                  |
| POST /tickets/pawn                          | `client_number, description, location, amount, onetime_fee, employee_password` | 201 `Ticket`                              |
| POST /tickets/sell                          | Same, without `onetime_fee`                                                    | 201 `Ticket`                              |
| PATCH /tickets/:ticketNumber                | `description, location, amount, onetime_fee, is_lost, employee_password`       | 200 `Ticket`                              |
| POST /tickets/:ticketNumber/convert         | Same plus `target_status`, without `is_lost`                                   | 200 `Ticket`                              |
| GET /tickets/:ticketNumber/transfer-preview | None                                                                           | 200 preview                               |
| POST /tickets/:ticketNumber/transfer        | `client_number`                                                                | 200 `Ticket`                              |
| POST /tickets/pickups                       | `tickets: [{ ticket_number, amount }]` (1–100, unique)                         | 200 `Ticket[]`                            |
| POST /tickets/extensions                    | `extensions: [{ ticket_number, months 1–24, amount }]`                         | 200 `Ticket[]`                            |
| POST /tickets/:ticketNumber/expire          | None                                                                           | 200 `Ticket`                              |
| PATCH /tickets/:ticketNumber/stolen         | `is_stolen`, `employee_password` (required when marking)                       | 200 `Ticket`                              |
| POST /tickets/:ticketNumber/reverse         | `employee_password`                                                            | 200 `{ ticket, client, previous_status }` |

Every ticket includes `earliest_pickup_date` and `pickup_allowed`, the legal release hold.
It is a warning; nothing is blocked. A missing ticket returns 404 with `field: "ticket_number"`.
DTO failures return `{ field, message }` for the first invalid field.

## Rules

- **Pawn and sell:** lock the client (missing 404, deactivated 409), require an active
  location, and resolve the PIN to the employee. Terms are 30 days for a pawn and 45 for a
  sale. Amounts allow one decimal place. A pawn may be $0; a sale must be above $0. A sale
  has no fee and adds to `sell_count`.
- **Edit:** only `pawned` or `sold`. An overdue pawn's amount cannot change (409). A ticket
  may keep a deactivated location; choosing another requires an active one.
- **Convert:** switches `pawned` and `sold`, keeps the transaction date, sets a new due date
  and moves `sell_count`. Needs an active client.
- **Transfer:** only `pawned` or `sold`, to a different client. Both must be active.
- **Payment:** the window sends the amounts it showed. The server locks the tickets, requires
  `pawned` and not stolen, recomputes each amount and rejects the whole batch with 409 if any differs.
- **Pickup:** stores the server amount, sets `pawned_picked_up` and adds to `redeem_count`.
- **Extension:** charges base interest × months, records an `interest_payment` and moves the
  due date 30 days per month.
- **Expire:** no PIN. Only `pawned` or `sold` past the due date. Adds to `expire_count`.
- **Stolen:** marking needs an open ticket and a PIN, and signs the client's notes. Unmarking
  needs no PIN or note.
- **Reverse:** only `pawned_expired` or `pawned_picked_up`, and not when an item moved to a
  newer or open ticket. Needs a PIN, keeps the undone values in `ticket_reversal`, reopens the
  pawn, lowers the matching counter and signs the client's notes.

## Money and dates

Base interest is 30%, with an early pickup rate within 7 calendar days. Paid interest is credited
at pickup. The earliest pickup date is two business days after the transaction, skipping weekends
and holidays, then the next day.

Calendar dates use `America/Regina` explicitly, so results do not depend on the server's time
zone. The frontend keeps `shared/utils/calculation.ts` for display previews only.

## Tests

- [ticket-finance.spec.ts](ticket-finance.spec.ts): calculation parity, legal hold and time zones.
- [ticket.http.spec.ts](ticket.http.spec.ts): lookups with a mocked pool and fixed clock.
- [ticket-issue.http.spec.ts](ticket-issue.http.spec.ts): issuing, rollback and validation.
- [ticket-actions.http.spec.ts](ticket-actions.http.spec.ts): every action against an in-memory fake.
