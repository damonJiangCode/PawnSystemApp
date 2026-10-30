# Ticket API

Every ticket workflow: lookups, issuing, edit/convert/transfer, payment and
status changes. It also owns the ticket money/date rules. Services:
`TicketService` (lookups, pawn/sell, edit, convert, transfer),
`TicketPaymentService` (pickups, extensions), `TicketStatusService` (expire,
stolen, reverse), sharing checks in `TicketSupport`
([ticket-support.ts](ticket-support.ts)). Writes run in one transaction
(`common/transaction.ts`) with the ticket row locked first (`FOR UPDATE OF t`),
then clients in number order. State changes are action sub-resources.

| Method + path                               | Input                                                                          | Success                                   | C → S → R                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| GET /tickets                                | Query: `client_number` (required)                                              | 200 `Ticket[]`                            | listByClient → listByClient → loadByClientNumber                                  |
| GET /tickets/:ticketNumber                  | number 1–2^31−1                                                                | 200 `{ ticket, client }`                  | findByNumber → findByNumber → loadByTicketNumber, `ClientRepository.loadByNumber` |
| POST /tickets/pawn                          | `client_number, description, location, amount, onetime_fee, employee_password` | 201 `Ticket`                              | createPawn → issue → see below                                                    |
| POST /tickets/sell                          | same without `onetime_fee`                                                     | 201 `Ticket`                              | createSell → issue → see below                                                    |
| PATCH /tickets/:ticketNumber                | `description, location, amount, onetime_fee, is_lost, employee_password`       | 200 `Ticket`                              | update → update                                                                   |
| POST /tickets/:ticketNumber/convert         | same plus `target_status` (`pawned`/`sold`), without `is_lost`                 | 200 `Ticket`                              | convert → convert                                                                 |
| GET /tickets/:ticketNumber/transfer-preview | —                                                                              | 200 preview                               | transferPreview → transferPreview                                                 |
| POST /tickets/:ticketNumber/transfer        | `client_number`                                                                | 200 `Ticket`                              | transfer → transfer                                                               |
| POST /tickets/pickups                       | `tickets: [{ ticket_number, amount }]` (1–100, unique)                         | 200 `Ticket[]`                            | pickup → pickup                                                                   |
| POST /tickets/extensions                    | `extensions: [{ ticket_number, months 1–24, amount }]`                         | 200 `Ticket[]`                            | extend → extend                                                                   |
| POST /tickets/:ticketNumber/expire          | —                                                                              | 200 `Ticket`                              | expire → expire                                                                   |
| PATCH /tickets/:ticketNumber/stolen         | `is_stolen`, `employee_password` (required when marking)                       | 200 `Ticket`                              | setStolen → setStolen                                                             |
| POST /tickets/:ticketNumber/reverse         | `employee_password`                                                            | 200 `{ ticket, client, previous_status }` | reverse → reverse                                                                 |

- Tickets are ordered by transaction time, then number. Amounts are numbers
  (`pg` returns NUMERIC as strings; [ticket.mapper.ts](ticket.mapper.ts) converts).
- `recorded_interest_amount_paid` / `recorded_interest_months_paid` sum
  `interest_payment` rows in the same query.
- Every ticket includes `earliest_pickup_date` (`YYYY-MM-DD`, shop calendar) and
  `pickup_allowed`: the legal release hold, reported for every status (a client
  may pay first and collect later). It is a warning; nothing is blocked.
- 404 `{ field: "ticket_number", message: "No ticket was found for that ticket number." }`
  when the ticket or its client is missing; invalid query/params: 400.
- `idx_ticket_client_number` keeps the client list an index scan (637k tickets).

## Pawn and sell

`TicketService.issue` runs in one transaction (`common/transaction.ts`):
lock the client row (`FOR UPDATE`; missing 404, deactivated 409), require an
active location (`FOR SHARE`; else 400 `location`), resolve the employee PIN to
the ticket's `employee_name` (nickname, else first name; else 400
`employee_password`), insert with server time and due date (pawn +30 days,
sell +45 days), and for sell set `onetime_fee` 0 and increment the client's
`sell_count`.

- DTO rules ([ticket.dto.ts](ticket.dto.ts)): description, location (trimmed,
  uppercased) and PIN required; amounts have at most one decimal place
  (`NUMERIC(10,1)`) and are at most 999,999,999.9. Pawn amount ≥ 0 (0 is for
  signature-only records; the dialog confirms it); sell amount > 0; one-time
  fee ≥ 0.
- The controller uses `fieldValidationPipe`, so DTO failures return
  `{ field, message }` for the first invalid field (type/presence messages win).
- [ticket-issue.http.spec.ts](ticket-issue.http.spec.ts) covers success paths,
  statement order, rollbacks and every validation message.

## Edit, convert, transfer

- **Edit**: only `pawned`/`sold`. Records the editor as `employee_name` (as
  before). Sold tickets need amount > 0 and always store fee 0. An overdue pawn's
  amount cannot change (409 `amount`). A ticket may keep a location deactivated
  after it was issued; choosing another one requires it to be active.
- **Convert** (`pawned` ↔ `sold`) corrects the pawn/sell choice: keeps the
  transaction date, sets a new due date from now (+30/+45 days), fee 0 for sold,
  requires an active client, and moves the client's `sell_count` (+1 to sold,
  −1 back to pawned, never below 0).
- **Transfer**: only `pawned`/`sold`, to a different client; both clients must
  be active (locked in number order). The preview refuses a deactivated owner.

## Payment

The payment window sends the amounts it showed. The server locks the selected
tickets (number order), requires `pawned` and not stolen, recomputes each amount
and rejects the whole batch with 409 "Ticket #N amount is now $X (the screen
showed $Y). Please review." if any differs to the cent.

- **Pickup** stores the server amount, sets `pawned_picked_up` and adds to each
  owner's `redeem_count`. Early pickup (legal hold) is only a UI warning.
- **Extension** charges base interest × months, records an `interest_payment`,
  adds the months to `interest_paid_months` and moves the due date 30 days per
  month.

## Expire, stolen, reverse

- **Expire**: no PIN; only `pawned`/`sold` past the due date (shop calendar);
  `sold` → `sold_expired`, else `pawned_expired`; `expire_count` +1.
- **Stolen**: marking needs `pawned`/`sold`, a PIN and appends
  `Ticket #N marked STOLEN (FIRSTNAME, MM-DD-YYYY)` to the client's notes.
  Unmarking needs no PIN or note and works on any status.
- **Reverse**: only `pawned_expired`/`pawned_picked_up`, not when an item is
  linked to a newer or open ticket. Needs a PIN, keeps the undone values in
  `ticket_reversal`, reopens the pawn, lowers `redeem_count`/`expire_count` and
  appends `Ticket #N pickup|expiry reversed (FIRSTNAME, MM-DD-YYYY)`.
- Signed entries use the employee's first name and Regina date, appended with a
  space, like client note signatures.

Tests: [ticket-actions.http.spec.ts](ticket-actions.http.spec.ts) runs every
route above against an in-memory fake of the statements, asserting resulting
statuses, counters and notes.

## Money and date rules

[ticket-finance.ts](ticket-finance.ts) is the authoritative implementation:
base interest (30%), early pickup (within 7 calendar days), payment pickup with
paid-interest credit, interest due, 30/45-day pawn/sell terms, calendar-date
comparisons and the earliest pickup date (two business days after the
transaction, skipping weekends and `holiday_date`, then the next day).

- Calendar dates use `America/Regina` explicitly (Saskatoon, no DST), so results
  do not depend on the server's time zone.
- The frontend keeps `shared/utils/calculation.ts` for display-only previews.
  The legal hold exists only here.
- [ticket-finance.spec.ts](ticket-finance.spec.ts) checks parity with the shared
  display copy across calendar boundaries, the legal-hold cases, and identical
  results under other process time zones. [ticket.http.spec.ts](ticket.http.spec.ts)
  covers both routes with a mocked pool and a fixed clock.
