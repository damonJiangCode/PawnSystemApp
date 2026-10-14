# Migration Status

Updated: 2026-10-13 (America/Regina)

## Current Docker Import

All Access import stages completed into `pawnsystemdb` in `pawnsystemcontainer`.
Imported: 56,301 clients, 127,121 client IDs, 102 employees, 636,513 tickets,
494,408 items, and 1,075,693 ticket-item links. Exported 37,968 client photos and
38,434 item photos to local Windows folders.

Validation passed for links, client statistics, numbering sequences, and file
existence for every stored photo path. App build passed. Desktop visual checks
remain pending. Nineteen active pawn tickets have UNKNOWN locations and prevent
production cutover; see `active-location-review.md`.

See `../../docker/README.md` for commands, backup locations, exceptions, and the
Windows line-ending category parser correction made before item commit.
The older completion notes below describe the previous migration environment.

This is the index for the migration workspace. Reports are kept to one file per migration subject.

## Reports

```txt
static-migration.md     ID type, hair color, and eye color mapping
city-migration.md       City/province/country reference migration
location-migration.md   Store/location mapping
category-migration.md   Item category/subcategory mapping
client-migration.md     Client migration plus client photo export
employee-migration.md   Employee migration and ticket employee backfill rule
ticket-migration.md     Ticket migration
item-migration.md       Item and ticket-item migration
final-migration-runbook.md Final cutover runbook for the last source refresh
```

## Scripts

```txt
setup-migration-db.sh       Create/reset the isolated migration database
migrate-static.cjs          Static-data comparison report
migrate-city.cjs            City/province/country migration
migrate-client.cjs          Client migration; preview unless --commit is passed
migrate-client-photos.cjs   Client photo export; DB update when --update-db is passed
migrate-client-statistics.cjs Client statistics recalculation; preview unless --commit is passed
migrate-employee.cjs        Employee migration; preview unless --commit is passed
migrate-ticket.cjs          Ticket migration; preview unless --commit is passed
migrate-item.cjs            Item and ticket-item migration; preview unless --commit is passed
migrate-item-photos.cjs     Item photo export; DB update when --update-db is passed
```

## Completed

- Static mapping for ID types, hair colors, and eye colors is approved.
- City migration is complete in `pawnsystemdb_migration`.
- Location mapping is approved.
- Category/subcategory mapping is approved.
- Client migration is complete, including address apartment merge, notes, photo path update, and recalculated redeem/expire/sold statistics.
- Employee migration is complete, including employee `999` and terminated-password handling.
- Ticket migration is complete through legacy ticket `982189`, including zero amounts, status mapping, pickup amount paid, missing clients, and employee-name backfill.
- Item and ticket-item migration is complete for the refreshed 2026-07-12 source, including quantity/default description cleanup and generated item numbers for invalid legacy item number 0 rows.
- Item photo export and path update is complete; paths point to `migration-data/exports/item-photos/`.

## Pending

- Legacy locations not in the current location list intentionally map to `UNKNOWN`, including active pawned tickets that still use those retired locations.
