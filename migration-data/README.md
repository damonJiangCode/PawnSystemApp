# Migration tooling and private data

Only reusable scripts and this directory guide are public. Supply your own private inputs locally.

- `scripts/`: reusable Access-to-PostgreSQL migration tooling.
- `source/`: private Access databases.
- `reports/`: private mappings, generated reports and run records.
- `exports/`: private exported photos and deployment data.
- `backups/`: private database and photo backups.

All directories above except `scripts/` are ignored. Some scripts require private category/location mapping documents in `reports/`; a public clone does not include them. Consult your local migration instructions before running any write operation. Ordinary application startup does not run migration scripts.
