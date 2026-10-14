#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-moneyexpress}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD in the private environment}"
MIGRATION_DB_NAME="${MIGRATION_DB_NAME:-pawnsystemdb_migration}"
ADMIN_DB_USER="${ADMIN_DB_USER:-$(whoami)}"

echo "Creating migration database if needed: ${MIGRATION_DB_NAME}"

if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${ADMIN_DB_USER}" -d postgres \
  -tAc "SELECT 1 FROM pg_database WHERE datname='${MIGRATION_DB_NAME}'" | grep -q 1; then
  echo "Database already exists: ${MIGRATION_DB_NAME}"
else
  createdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${ADMIN_DB_USER}" "${MIGRATION_DB_NAME}"
  echo "Database created: ${MIGRATION_DB_NAME}"
fi

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${ADMIN_DB_USER}" -d postgres \
  -c "ALTER DATABASE ${MIGRATION_DB_NAME} OWNER TO ${DB_USER};"

echo "Initializing app schema in ${MIGRATION_DB_NAME}"

DB_HOST="${DB_HOST}" \
DB_PORT="${DB_PORT}" \
DB_USER="${DB_USER}" \
DB_PASSWORD="${DB_PASSWORD}" \
DB_NAME="${MIGRATION_DB_NAME}" \
npm run db:init

echo "Migration database setup complete."
