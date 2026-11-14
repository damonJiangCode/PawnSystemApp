# XML Report API (LeadsOnline)

Sends pawn and buy tickets to LeadsOnline, the police reporting service, through its SOAP
web service. Only the server holds the LeadsOnline login.

| Endpoint                    | Input                         | Success                                               |
| --------------------------- | ----------------------------- | ----------------------------------------------------- |
| GET /xml-reports/connection | none                          | 200 `{ environment, connected, error_code, message }` |
| GET /xml-reports/preview    | query `from_date`, `to_date`  | 200 tickets as they would be sent                     |
| POST /xml-reports/submit    | body `{ from_date, to_date }` | 200 one result per ticket                             |

## Settings

`LEADSONLINE_ENV` (`sandbox` or `production`, any case; empty means `sandbox`, any other value
stops the server at startup), `LEADSONLINE_STORE_ID`,
`LEADSONLINE_USERNAME`, `LEADSONLINE_PASSWORD` in the server `.env`. The server starts without
them; connection and submit then answer 503, and preview still works.

## Behaviour

- Dates are shop days in `America/Regina`, with the same range rules as the reports
  (To ≥ From, under one year). `ticketDateTime` and `redeemByDate` are formatted in SQL in
  Regina time, so the payload does not depend on the server's time zone.
- Sold tickets are sent as `Buy`, all others as `Pawn`.
- Preview lists errors (no items, an item with no details), which block the submit, and
  warnings (missing ID, address, phone), which do not.
- Submit sends tickets one at a time and saves every attempt in `xml_report_submission`
  for the current environment. Tickets already submitted are skipped; a failed ticket does not
  stop the others and is retried on the next submit.
- Only one submit runs at a time (PostgreSQL advisory lock). A second one answers 409.
- LeadsOnline requests time out after 30 seconds. Network failures become a failed result
  (`error_code: -1`), not a server error.

## Errors

| Status | Message                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| 400    | DTO and range messages with `field`, as in the reports                       |
| 400    | `There are no tickets to submit for this date range.`                        |
| 400    | `Fix all invalid tickets before submitting the report.`                      |
| 409    | `A LeadsOnline submission is already running. Wait for it to finish.`        |
| 503    | `LeadsOnline is not set up on the server. Check the LEADSONLINE_* settings.` |

Tests: [xml-report.http.spec.ts](xml-report.http.spec.ts),
[leadsonline.client.spec.ts](leadsonline.client.spec.ts),
[xml-report.mapper.spec.ts](xml-report.mapper.spec.ts).
