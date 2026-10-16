# Migration inputs and outputs

Tracked inputs:

- `scripts/`: reusable migration code.
- `mappings/category-mapping.md`: required category conversion rules.
- `mappings/location-mapping.md`: required location-code conversion rules.

Mapping files contain conversion rules only and are included in a Git clone. Keep them; they are not generated reports. The mapping directory is mounted read-only during migration.

Private local data (ignored by Git and Docker builds):

- `source/`: original Access databases; supply these privately on a new computer.
- `reports/`: generated migration results and diagnostics.
- `exports/`: exported client and item photos.
- `backups/`: database and photo backups.

Do not put customer records, credentials, source usage statistics, or generated reports in `mappings/`.

Run `npm run migration:prepare`, start the Compose database, then explicitly run `npm run migration:execute`. Keep the app closed during import. Each execution uses its own private report and backup directory; it refuses populated targets and never automatically clears or resumes them.
