#!/usr/bin/env bash
# Idempotent local PostgreSQL role + database for PM2 deploy.
# Reads deploy/.env (POSTGRES_*). Skips when POSTGRES_HOST is not local.
#
# Called from run-production.sh after prepare_env.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/deploy/.env}"

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "Error: root or sudo required to configure PostgreSQL." >&2
    exit 1
  fi
}

run_as_postgres() {
  if [[ "$(id -u)" -eq 0 ]]; then
    if command -v runuser >/dev/null 2>&1; then
      runuser -u postgres -- "$@"
    else
      su - postgres -c "$(printf '%q ' "$@")"
    fi
  elif command -v sudo >/dev/null 2>&1; then
    sudo -u postgres "$@"
  else
    echo "Error: sudo required to run commands as postgres." >&2
    exit 1
  fi
}

load_env_file() {
  local file=$1
  [[ -f "$file" ]] || return 1
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//$'\r'/}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      value="${value#\"}"; value="${value%\"}"
      value="${value#\'}"; value="${value%\'}"
      export "$key=$value"
    fi
  done < "$file"
  return 0
}

is_local_postgres_host() {
  local host="${1:-127.0.0.1}"
  case "$host" in
    127.0.0.1 | localhost | ::1) return 0 ;;
    *) return 1 ;;
  esac
}

ensure_postgresql_installed() {
  if command -v psql >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    echo "==> Installing PostgreSQL (apt)..."
    run_root apt-get update
    run_root apt-get install -y postgresql postgresql-client
  fi
  if command -v psql >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
    return 0
  fi
  echo "Error: PostgreSQL server not installed (missing psql or postgres OS user)." >&2
  echo "  Run: bash run-production.sh --install-system-deps" >&2
  exit 1
}

ensure_postgresql_running() {
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet postgresql 2>/dev/null; then
      return 0
    fi
    echo "==> Starting PostgreSQL (systemctl)..."
    run_root systemctl enable postgresql 2>/dev/null || true
    if ! run_root systemctl start postgresql 2>/dev/null; then
      for unit in postgresql@16-main postgresql@15-main postgresql@14-main; do
        if run_root systemctl start "$unit" 2>/dev/null; then
          return 0
        fi
      done
      echo "Error: could not start PostgreSQL (systemctl start postgresql failed)." >&2
      exit 1
    fi
    return 0
  fi
  echo "==> systemctl not found; assuming PostgreSQL is already running."
}

write_provision_sql() {
  local out=$1
  export SETUP_PG_USER SETUP_PG_PASS SETUP_PG_DB
  python3 <<'PY' >"$out"
import os
import re

user = os.environ["SETUP_PG_USER"]
password = os.environ["SETUP_PG_PASS"]
database = os.environ["SETUP_PG_DB"]

for label, value in (("SETUP_PG_USER", user), ("SETUP_PG_DB", database)):
    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", value):
        raise SystemExit(f"invalid SQL identifier: {label}")


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


# CREATE DATABASE cannot run inside a DO/transaction block — use psql \\gexec at top level.
print(
    f"""
DO $cms_pg_setup$
DECLARE
  uname text := {sql_literal(user)};
  upass text := {sql_literal(password)};
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = uname) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', uname, upass);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', uname, upass);
  END IF;
END
$cms_pg_setup$;

SELECT format('CREATE DATABASE %I OWNER %I', '{database}', '{user}')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '{database}')\\gexec
"""
)
PY
}

provision_local_database() {
  local pg_user="${POSTGRES_USER:-case_management}"
  local pg_pass="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
  local pg_db="${POSTGRES_DB:-case_management}"

  if [[ ! "$pg_user" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ || ! "$pg_db" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "Error: POSTGRES_USER and POSTGRES_DB must be simple SQL identifiers." >&2
    exit 1
  fi

  export SETUP_PG_USER="$pg_user"
  export SETUP_PG_PASS="$pg_pass"
  export SETUP_PG_DB="$pg_db"

  local sql_dir sql_file
  sql_dir="${ROOT}/.run-production"
  mkdir -p "$sql_dir"
  sql_file="${sql_dir}/pg-provision.sql"
  write_provision_sql "$sql_file"
  # postgres OS user must read the file (-f); root-owned 600 under /tmp fails.
  chmod 644 "$sql_file"

  echo "==> Ensuring PostgreSQL role/database (${pg_user} / ${pg_db})..."
  # Root reads SQL; postgres runs psql (avoids unreadable root-only files under /tmp).
  run_as_postgres psql -v ON_ERROR_STOP=1 -f - <"$sql_file"
  rm -f "$sql_file"
  echo "    Role and database ready"
}

main() {
  if [[ "${SETUP_POSTGRES:-1}" == "0" || "${SETUP_POSTGRES:-1}" == "false" ]]; then
    echo "==> Skipping PostgreSQL setup (SETUP_POSTGRES=0)"
    return 0
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: missing $ENV_FILE" >&2
    exit 1
  fi
  load_env_file "$ENV_FILE"

  local pg_host="${POSTGRES_HOST:-127.0.0.1}"
  if ! is_local_postgres_host "$pg_host"; then
    echo "==> POSTGRES_HOST=${pg_host} — skipping local PostgreSQL provisioning (remote DB)"
    return 0
  fi

  if [[ -z "${POSTGRES_PASSWORD:-}" || "${POSTGRES_PASSWORD}" == "change-me-postgres-password" ]]; then
    echo "Error: set POSTGRES_PASSWORD in $ENV_FILE before setup." >&2
    exit 1
  fi

  ensure_postgresql_installed
  ensure_postgresql_running
  provision_local_database
}

main "$@"
