# Migration inputs and outputs

Tracked inputs:

- `scripts/`: reusable migration code.
- `mappings/category-mapping.json`: required category conversion rules.
- `mappings/location-mapping.json`: required location-code conversion rules.
- `mappings/client-mapping.json`: required client initialization rules.

Mapping files are executable JSON inputs, read directly with `JSON.parse`:

- Category: `subcategoryRules` and `parentRules` arrays of `{ source, category, subcategory }`. Sources are normalized lookup keys. Specific subcategory rules take priority over parent rules; legacy codes `7777` and `7779` explicitly map to `OTHER / other`. See [category notes](category-notes.md) for rationale.
- Location: an array of `{ legacy_location, mapped_location }`. Unresolved locations use `UNKNOWN`.
- Client: `{ "hold_until": { "source": "fixed_date", "value": "2026-01-01" } }`.

Readers reject malformed or empty rules, unexpected fields, and conflicting normalized sources. Preparation checks that all three JSON inputs exist and are tracked; execution records their hashes in its input manifest and verifies they have not changed.

Mapping files contain conversion rules only and are included in a Git clone. Keep them; they are not generated reports. The mapping directory is mounted read-only during migration. Markdown files are explanatory documentation, not runtime inputs.

Client migration initializes `hold_until` to the fixed historical baseline
`2026-01-01`, including the fallback client. It never uses the migration
execution date and does not create a permanent database default.
`migrate-client.cjs` reads this mapping, includes the value in its batch
INSERT, and records the date in the migration report. The fresh-database CREATE
TABLE definition includes the column; existing databases must be updated with
separate SQL before importing. Application-created clients still default to NULL.

Private local data (ignored by Git and Docker builds):

- `source/`: original Access databases; supply these privately on a new computer.
- `reports/`: generated migration results and diagnostics.
- `exports/`: exported client and item photos.
- `backups/`: database and photo backups.

Do not put customer records, credentials, source usage statistics, or generated reports in `mappings/`.

Run `npm run migration:prepare`, start the Compose database, then explicitly run `npm run migration:execute`. Keep the app closed during import. Each execution uses its own private report and backup directory; it refuses populated targets and never automatically clears or resumes them.
