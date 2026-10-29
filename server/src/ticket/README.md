# Ticket API

Tickets are migrating from Electron IPC slice by slice. This module currently
serves lookups and owns the ticket money/date rules; pawn, sell, edit, convert,
transfer, payment, expire, stolen and reverse still run in Electron main.

| Method + path              | Input                             | Success                  | C → S → R                                                                         |
| -------------------------- | --------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| GET /tickets               | Query: `client_number` (required) | 200 `Ticket[]`           | listByClient → listByClient → loadByClientNumber                                  |
| GET /tickets/:ticketNumber | number 1–2^31−1                   | 200 `{ ticket, client }` | findByNumber → findByNumber → loadByTicketNumber, `ClientRepository.loadByNumber` |

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
