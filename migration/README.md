# Migration inputs and outputs

Tracked inputs:

- `scripts/`: reusable migration code.
- `mappings/category-mapping.json`: required category conversion rules.
- `mappings/location-mapping.json`: required location-code conversion rules.

Mapping files are executable JSON inputs, read directly with `JSON.parse`:

- Category: `subcategoryRules` and `parentRules` arrays of `{ source, category, subcategory }`. Sources are normalized lookup keys. Specific subcategory rules take priority over parent rules; legacy codes `7777` and `7779` explicitly map to `OTHER / other`. See [category notes](category-notes.md) for rationale.
- Location: an array of `{ legacy_location, mapped_location }`. Unresolved locations use `UNKNOWN`.

Readers reject malformed or empty rules, unexpected fields, and conflicting normalized sources. Preparation checks that both JSON inputs exist and are tracked; execution records their hashes in its input manifest and verifies they have not changed.

Mapping files contain conversion rules only and are included in a Git clone. Keep them; they are not generated reports. The mapping directory is mounted read-only during migration. Markdown files are explanatory documentation, not runtime inputs.

Client migration omits `hold_until` from its batch INSERT, including for the
fallback client. The nullable DATE column has no database default, so imported
clients start with NULL (no hold). There is no client initialization mapping or
fixed baseline date. Users can set or clear a hold later. The fresh-database
CREATE TABLE definition includes the column; existing databases must be updated
with separate SQL before importing.

Client migration explicitly inserts `is_active = TRUE` for every imported client,
including the fallback client. The CREATE TABLE definition also defaults new
clients to active. Existing databases need this column added separately before
importing; the migration does not alter the schema. Clients can be deactivated
later by the application without deleting their records or tickets.

Private local data (ignored by Git and Docker builds):

- `source/`: original Access databases; supply these privately on a new computer.
- `reports/`: generated migration results and diagnostics.
- `exports/`: exported client and item photos.
- `backups/`: database and photo backups.

Do not put customer records, credentials, source usage statistics, or generated reports in `mappings/`.

Run `npm run migration:prepare`, start the Compose database, then explicitly run `npm run migration:execute`. Keep the app closed during import. Each execution uses its own private report and backup directory; it refuses populated targets and never automatically clears or resumes them.
