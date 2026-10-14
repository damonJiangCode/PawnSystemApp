# Ticket Migration

Generated: 2026-10-14T02:06:43.254Z

Source: `SA100TRAN` in `superpawnconv.mdb`

Target database: `pawnsystemdb`

Mode: commit

## Summary

| Metric | Count |
| --- | ---: |
| Legacy ticket rows scanned | 636,518 |
| Duplicate earlier rows skipped | 5 |
| Rows inserted | 636,513 |
| Target ticket rows after commit | 636,513 |
| Missing clients mapped to Unknown Legacy Client | 6 |

## Blockers

_none_

## Statuses

```txt
 487570  pawned_picked_up
 130997  pawned_expired
  15387  sold_expired
   2559  pawned
```

## Status Rules

```txt
 476132  P treated as P with payback
 130997  E
  15387  E at BIWK
  10712  B treated as B
   2552  P treated as active P
    701  S/stolen with payback
     25  A treated as B
      7  S/stolen active
```

## Amount Sources

```txt
 611514  pawn amount
  14084  sale amount from amount paid
  10915  zero amount allowed
```

## Pickup Amount Paid Sources

```txt
 475821  SA100AMOUNPB
 148943  not picked up
  10716  SA100AMOUNTPAY fallback
   1033  zero pickup amount
```

## Interest Paid Month Sources

```txt
 610942  derived from dates and original due days
  15387  sell ticket
  10184  INTFLAG fallback
```

## Warnings

```txt
    533  due date derived from transaction date plus due days
      6  client missing from target mapped to Unknown Legacy Client
      5  duplicate earlier row skipped
```

## Employee Backfill

During insert, `employee_name` is staged as `Legacy Employee {legacy_employee_number}`.
Before commit, migrated employee nicknames are backfilled from the `employee` table.
The ticket number identity sequence is also advanced to the maximum migrated ticket number.
