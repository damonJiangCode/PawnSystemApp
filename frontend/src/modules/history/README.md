# History Module

`history/` owns the History page workflow.

This page shows completed or expired tickets for the selected client and lets
staff inspect, edit item info, load items, repawn, or reverse old tickets.

## Structure

```text
history/
  pages/
    HistoryPage.tsx
  hooks/
    useHistoryPage.ts
  components/
    ReverseTicketDialog.tsx
```

## Responsibilities

This module owns:

- history ticket list
- selected history ticket
- items for selected history ticket
- repawn dialog state
- edit item dialog state
- loading history items into Item Search
- confirming Reverse for eligible pawn tickets

It uses components from:

- `modules/tickets/components/history`
- `modules/items/components/history`
- `modules/tickets/components/dialogs`
- `modules/items/components/dialogs`

## History Ticket Rule

History page should show only:

```text
pawned_expired
pawned_picked_up
sold_expired
```

Display can abbreviate these for staff, but code should keep the full status
names.

## Repawn Flow

```text
Repawn click
  -> open Item Search window immediately with source ticket items
  -> open TicketPawnDialog
  -> save creates new pawn ticket
  -> print envelope ticket
  -> Workspace switches to Transaction
  -> new ticket is selected
  -> Item Search Add To Ticket becomes available
```

Important rule:

- Repawn preview opens the item window before creating the new ticket, but it
  must not add items until Transaction has a selected ticket.

## Load Flow

```text
Load click
  -> open or reuse Item Search window
  -> focus Item Search window
  -> append source ticket items without duplicates
```

## Reverse Flow

```text
Reverse click
  -> open ReverseTicketDialog using the selected History ticket
  -> show the calculated pickup amount
  -> confirm and validate the current ticket in main
  -> restore the ticket to Transaction
  -> refresh both pages and select the restored ticket
```

Only `pawned_expired` and `pawned_picked_up` can be reversed. `sold_expired`
cannot be reversed.

## Review Notes

When reviewing this module, check:

- newest ticket is selected and visible by default
- selected ticket survives refresh when possible
- Repawn does not duplicate item rows in Item Search
- Load can add items from multiple old tickets into one Item Search window
- status filtering matches the business rule
