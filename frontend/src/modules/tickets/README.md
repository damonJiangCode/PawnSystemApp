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

- ticket renderer API wrapper
- pawn/sell/edit/expire/convert/transfer dialogs
- transaction ticket table/actions
- history ticket table/actions
- ticket search window
- stolen/expire menu windows
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
interest, pickup, and extension flows.

## Reverse

Reverse confirmation is owned by `history/components/ReverseTicketDialog.tsx`.
The mutation remains in `ticket.api.ts` and the main ticket reversal service.

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
