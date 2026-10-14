# Client City Migration

Generated: 2026-10-14T01:52:54.284Z

Scope: migrate city/province/country values actually used by legacy `AR200CLIENT` into the migration database `city` table, then remove current city rows that overlap those legacy cities but are not legacy-used.

Target database:

```txt
pawnsystemdb:5432/pawnsystemdb as moneyexpress
```

## Summary

```txt
Legacy client rows: 56300
Distinct legacy-used city combos: 601
City rows before migration: 2136
Legacy-used combos inserted: 4
Legacy client rows covered by inserted combos: 4
Overlapping unused current city rows deleted: 1
City rows after cleanup: 2139
Legacy-used combos still missing: 0
```

## Deleted Overlapping Unused Current Rows

| deleted_city | province | country | kept_legacy_city | legacy_use_count |
| --- | --- | --- | --- | --- |
| Corman Park No. 344 | Saskatchewan | Canada | CORMAN PARK | 1 |

## Inserted Legacy-Used City Combos

| use_count | city | province | country | example_clients |
| --- | --- | --- | --- | --- |
| 1 | CORMAN PARK | Saskatchewan | Canada | 81455: LABELLE, EZEKIEL |
| 1 | MUSKowekwan | Saskatchewan | Canada | 81687: LAVALLEE-RAPHAEL, ANNA-LEE |
| 1 | RED PHEASANT FN | Saskatchewan | Canada | 81600: ALBERT, LATISHA |
| 1 | RM OF Canwood | Saskatchewan | Canada | 81518: DURET, KEEGAN |


## Still Missing

_none_
