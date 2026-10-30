# Tickets Module

`tickets/` owns ticket UI pieces, ticket dialogs, ticket windows, payment, and
the renderer ticket API wrapper.

The active Transaction page itself lives in `modules/transactions`, but it uses
many ticket components from this module.

## Structure

```text
tickets/
  ticket.api.ts
  helpers/
    ticketApiUtils.ts
  layout/
    ticketLayout.ts
  print/
    ticketPrintTemplate.ts
  components/
    dialogs/
    transaction/
    history/
    shared/
  menu-actions/
  payment/
```

## Responsibilities

This module owns:

- ticket renderer API wrapper: `ticket.api.ts` calls `getAppApi().ticket`, built by
  `createTicketHttpApi()` in `src/shared/api/ticket.http.ts` (NestJS `/tickets`).
  The server validates every request; errors carry its `field` and `status`, and
  dialogs show field errors under the matching input.
- pawn/sell/edit/convert/transfer dialogs ($0 pawns ask for confirmation in a
  focused dialog; sells need an amount above 0)
- transaction ticket table/actions
- history ticket table/actions
- ticket search window
- stolen/expire menu windows (expire needs no PIN; marking stolen needs a PIN and
  signs the client's notes; a stolen ticket opens in "Mark Not Stolen" mode)
- payment window
- envelope ticket print template

## Status Names

Code status values:

```text
pawned
pawned_expired
pawned_picked_up
sold
sold_expired
```

Transaction page shows:

```text
pawned
sold
```

History page shows:

```text
pawned_expired
pawned_picked_up
sold_expired
```

History display can shorten:

```text
E = expired
P = picked up
```

## Payment

Important files:

- `payment/PaymentWindow.tsx`
- `payment/usePaymentWindow.tsx`
- `payment/payment.columns.tsx`
- `payment/payment.helpers.ts`
- `payment/payment.rowHandlers.ts`
- `payment/payment.types.ts`

Payment behavior should be reviewed carefully because it touches money,
interest, pickup, and extension flows. The legal pickup hold
(`isPickupAllowed`, `earliestPickupDate`) comes from the server's
`pickup_allowed` / `earliest_pickup_date`; the window only warns and asks for
confirmation before an early pickup. Lost tickets warn "Lost ticket: only this
client can pick up." On Done the window sends the pickup/extension amounts it
showed; the server rejects the batch (409) if any differs, and the window asks
to reopen Payment for current amounts.

## Reverse

Reverse confirmation is owned by `history/components/ReverseTicketDialog.tsx`,
which asks for an employee PIN; the server signs the client's notes
(`Ticket #N pickup|expiry reversed (NAME, date)`).

Reverse changes `pawned_expired` or `pawned_picked_up` back to `pawned`. It
writes an audit row, corrects the matching client statistic, and refuses
tickets whose items moved to a newer or active ticket.

## Print Template

Important files:

- `ticket.api.ts`
- `print/ticketPrintTemplate.ts`

Rules:

- template prints on colored paper, so the template should not add background color.
- layout should fit one envelope ticket format.
- business values should come from the ticket/client data passed into printing.

## Review Notes

When reviewing this module, check:

- money calculations
- status transitions
- selected ticket after actions
- password focus on validation errors
- wheel scrolling disabled on money inputs
- print template alignment
