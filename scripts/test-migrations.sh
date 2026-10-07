#!/usr/bin/env bash
# Draait alle migraties op een lege Postgres-database (met een auth-stub) en
# daarna de RLS-checks. Verwacht een bereikbare Postgres via de standaard
# PG*-omgevingsvariabelen (PGHOST, PGPORT, PGUSER, PGPASSWORD).
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres ./scripts/test-migrations.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB=migration_test
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
PSQL=(psql -q -v ON_ERROR_STOP=1 -d "$DB")

"${PSQL[@]}" -f supabase/tests/auth_stub.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "apply $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

"${PSQL[@]}" -f supabase/tests/rls.sql
