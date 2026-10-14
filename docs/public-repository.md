# Public repository policy

Publish application source, tests with fictional data, reference seeds, generic development instructions and sanitized `.env.example` templates. Names such as `Client` and fields such as `password` in source code are part of the software, not stored customer records.

Keep the following local and ignored:

- Actual `.env` files, credentials and private keys.
- `migration-data/source/`, `exports/`, `reports/` and `backups/`.
- Customer and item photos in `images/` and photo export folders.
- Access databases, database dumps, local databases and backup archives.
- Runtime logs, generated reports, private deployment configuration and work files.
- Third-party SOAP reference documents in `SOAP/`; review permission and sanitize before publishing any replacement examples.

Use `private/` for store-specific files that have no dedicated ignored directory. Public screenshots must use fictional records and no real photos. Do not put real records inside test fixtures, source code or public documentation: path-based ignore rules cannot detect their contents.

## Before publishing

Review `git diff --cached` and `git status --short`. Use `git check-ignore -v <path>` to check private paths. A tracked file remains tracked until explicitly removed from the index; ignoring it alone does not remove it.

Removing a file from the current tree does not remove earlier commits. If real credentials or private records were committed, rotate those credentials and separately clean the repository history and other published copies. A history rewrite changes commit IDs and requires coordination with other clones.
