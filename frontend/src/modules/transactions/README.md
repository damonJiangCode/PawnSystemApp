# Transactions Module

`transactions/` owns the active Transaction page workflow.

This is a workflow module, not a database domain. It coordinates tickets, items,
client context, dialogs, and selected rows for active work.

## Structure

```text
transactions/
  pages/
    TransactionPage.tsx
  hooks/
    useTransactionPage.ts
  handlers/
    transactionTicketHandlers.ts
    transactionItemHandlers.ts
  helpers/
    transaction.helpers.ts
```

## Responsibilities

This module owns:

- active ticket list
- selected active ticket
- selected item for the active ticket
- pawn/sell dialog state
- edit/convert/expire/pickup/transfer actions
- linking items loaded from Item Search to the selected transaction ticket

It uses components from:

- `modules/tickets/components/transaction`
- `modules/items/components/transaction`
- `modules/tickets/components/dialogs`
- `modules/items/components/dialogs`

## Hook, Handler, Helper Rule

```text
useTransactionPage
  owns Transaction page state
  loads tickets and items
  creates ticket/item handlers
  returns state and actions to TransactionPage

handlers/
  handles user events
  can call ticket.api or item.api
  can update Transaction page state

helpers/transaction.helpers.ts
  pure helper functions
  no API calls
  no React state setters
```

The hook returns an `actions` object to the page because that is the UI event
surface. The implementation files are called `handlers` because they are not
pure helpers.

## Active Ticket Rule

Transaction page should show only active ticket statuses:

```text
pawned
sold
```

History-only statuses should stay out of this page:

```text
pawned_expired
pawned_picked_up
sold_expired
```

## Main Flow

```text
TransactionPage
  -> useTransactionPage
  -> transactionTicketHandlers / transactionItemHandlers
  -> ticket.api / item.api
  -> preload
  -> main handlers
```

## Review Notes

When reviewing this module, check:

- selected ticket is preserved after edits
- newest pawn/sell ticket becomes selected after creation
- table scroll makes selected ticket visible
- money fields do not change from mouse wheel scrolling
- one-time fee and partial payment are skipped in normal tab flow
- add-to-ticket only targets the selected Transaction ticket
