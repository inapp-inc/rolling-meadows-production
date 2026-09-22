#!/usr/bin/env bash
# Unzip-and-run entry point for the PM2 deploy archive (no Docker).
#
#   sudo mkdir -p /var/www/case-management
#   sudo unzip -o case-management-linux.zip -d /var/www/case-management
#   cd /var/www/case-management
#   sudo bash start.sh
#
# Optional: bash start.sh --no-build

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/.env}"

chmod +x "$ROOT/run-production.sh" "$ROOT/deploy/deploy-pm2.sh" "$ROOT/deploy/configure-nginx.sh" \
  "$ROOT/deploy/setup-postgres.sh" 2>/dev/null || true

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex(32))"
    return 0
  fi
  echo "Error: openssl or python3 required to generate secrets." >&2
  exit 1
}

replace_env_value() {
  local key=$1
  local value=$2
  local file=$3
  local tmp
  tmp="$(mktemp)"
  awk -v k="$key" -v v="$value" '
    BEGIN { done = 0 }
    index($0, k "=") == 1 { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$file" >"$tmp"
  mv "$tmp" "$file"
}

bootstrap_env() {
  mkdir -p "$ROOT/deploy" "$ROOT/branding" "$ROOT/logs" "$ROOT/api/seed-data"
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ ! -f "$ROOT/deploy/.env.example" ]]; then
      echo "Error: missing $ROOT/deploy/.env.example" >&2
      exit 1
    fi
    cp "$ROOT/deploy/.env.example" "$ENV_FILE"
    echo "==> Created $ENV_FILE from deploy/.env.example"
  fi

  local jwt pg
  jwt="$(awk -F= '/^JWT_SECRET=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  pg="$(awk -F= '/^POSTGRES_PASSWORD=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"

  if [[ -z "$jwt" || "$jwt" == "change-me-use-openssl-rand-hex-32" ]]; then
    replace_env_value "JWT_SECRET" "$(random_hex)" "$ENV_FILE"
    echo "==> Generated JWT_SECRET in $ENV_FILE"
  fi
  if [[ -z "$pg" || "$pg" == "change-me-postgres-password" ]]; then
    replace_env_value "POSTGRES_PASSWORD" "$(random_hex)" "$ENV_FILE"
    echo "==> Generated POSTGRES_PASSWORD in $ENV_FILE (start.sh will create the PostgreSQL role/db)"
    pg="$(awk -F= '/^POSTGRES_PASSWORD=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  fi

  local pg_user pg_host pg_port pg_db db_url
  pg_user="$(awk -F= '/^POSTGRES_USER=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  pg_host="$(awk -F= '/^POSTGRES_HOST=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  pg_port="$(awk -F= '/^POSTGRES_PORT=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  pg_db="$(awk -F= '/^POSTGRES_DB=/{print $2; exit}' "$ENV_FILE" | tr -d '\r')"
  pg_user="${pg_user:-case_management}"
  pg_host="${pg_host:-127.0.0.1}"
  pg_port="${pg_port:-5432}"
  pg_db="${pg_db:-case_management}"
  replace_env_value "POSTGRES_HOST" "$pg_host" "$ENV_FILE"
  replace_env_value "POSTGRES_USER" "$pg_user" "$ENV_FILE"
  replace_env_value "POSTGRES_DB" "$pg_db" "$ENV_FILE"
  replace_env_value "POSTGRES_PORT" "$pg_port" "$ENV_FILE"
  db_url="$(python3 "$ROOT/deploy/build-database-url.py" "$pg_user" "$pg" "$pg_host" "$pg_port" "$pg_db")"
  replace_env_value "DATABASE_URL" "$db_url" "$ENV_FILE"
}

needs_system_deps() {
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi
  if (( $(node -p "process.versions.node.split('.')[0]") < 20 )); then
    return 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v psql >/dev/null 2>&1 || ! id postgres >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v pg_isready >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

should_configure_nginx() {
  [[ "$CONFIGURE_NGINX" -eq 1 ]] || return 1
  [[ -f "$ENV_FILE" ]] || return 1
  local host
  host="$(awk -F= '/^PUBLIC_HOST=/{print $2; exit}' "$ENV_FILE" | tr -d '\r' | xargs)"
  [[ -n "$host" ]] || return 1
  [[ "$host" != "your-host.example.com" ]] || return 1
  return 0
}

bootstrap_env

CONFIGURE_NGINX=1
PASSTHRU=()
for arg in "$@"; do
  case "$arg" in
    --no-nginx) CONFIGURE_NGINX=0 ;;
    *) PASSTHRU+=("$arg") ;;
  esac
done

ARGS=(--pm2)
if needs_system_deps; then
  ARGS+=(--install-system-deps)
fi
if [[ ${#PASSTHRU[@]} -gt 0 ]]; then
  ARGS+=("${PASSTHRU[@]}")
fi

echo "==> Starting Case Management Platform with PM2"
"$ROOT/run-production.sh" "${ARGS[@]}"

if should_configure_nginx; then
  echo "==> Configuring nginx reverse proxy..."
  bash "$ROOT/deploy/configure-nginx.sh"
else
  echo "==> Skipping nginx (set PUBLIC_HOST in deploy/.env to enable, or pass --no-nginx)"
fi

if command -v pm2 >/dev/null 2>&1 && pm2 describe case-management-app >/dev/null 2>&1; then
  pm2 save >/dev/null 2>&1 || true
  echo "==> PM2 process list saved (run 'pm2 startup' once after reboot if needed)"
fi
