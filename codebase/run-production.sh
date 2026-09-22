#!/usr/bin/env bash
# Case Management Platform — bare-metal production (FastAPI + Vite static + PostgreSQL)
#
#   cp deploy/.env.example deploy/.env
#   ./run-production.sh --install-system-deps
#   ./run-production.sh --pm2
#
# Loopback: http://127.0.0.1:4510/case-management/
# Put nginx in front (deploy/configure-nginx.sh).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/deploy/.env}"
LOG_DIR="${LOG_DIR:-$ROOT/.run-production/logs}"

INSTALL_SYSTEM=0
DO_BUILD=1
USE_PM2=0

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \?//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-system-deps) INSTALL_SYSTEM=1; shift ;;
    --no-build) DO_BUILD=0; shift ;;
    --pm2) USE_PM2=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    echo "Error: run-production.sh targets Linux (Ubuntu server)." >&2
    exit 1
  fi
}

install_system_packages() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Error: apt-get not found. Install Node >= 20, Python 3.12+, PostgreSQL, curl manually." >&2
    exit 1
  fi
  echo "==> Installing system packages (sudo may prompt)..."
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates gnupg build-essential python3 python3-venv python3-pip \
    postgresql postgresql-client libpq-dev
  if ! command -v node >/dev/null 2>&1 || (( $(node -p "process.versions.node.split('.')[0]") < 20 )); then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
}

require_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Installing pm2 (npm install -g pm2)..."
  if npm install -g pm2 >/dev/null 2>&1; then
    command -v pm2 >/dev/null 2>&1 && return 0
  fi
  if command -v sudo >/dev/null 2>&1 && sudo npm install -g pm2 >/dev/null 2>&1; then
    command -v pm2 >/dev/null 2>&1 && return 0
  fi
  echo "Error: could not install pm2. Try: sudo npm install -g pm2" >&2
  exit 1
}

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js >= 20 required. Run: $0 --install-system-deps" >&2
    exit 1
  fi
  if (( $(node -p "process.versions.node.split('.')[0]") < 20 )); then
    echo "Error: Node.js >= 20 required (found $(node -v))." >&2
    exit 1
  fi
  command -v npm >/dev/null 2>&1 || { echo "Error: npm is required." >&2; exit 1; }
  command -v curl >/dev/null 2>&1 || { echo "Error: curl is required." >&2; exit 1; }
}

require_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required. Run: $0 --install-system-deps" >&2
    exit 1
  fi
}

normalize_path() {
  local value="${1:-}"
  value="/${value#/}"
  echo "${value%/}"
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

prepare_env() {
  echo "==> Loading production environment..."
  mkdir -p "$ROOT/deploy" "$ROOT/branding" "$ROOT/logs" "$ROOT/api/seed-data"
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ROOT/deploy/.env.example" ]]; then
      cp "$ROOT/deploy/.env.example" "$ENV_FILE"
      echo "    Created $ENV_FILE from deploy/.env.example — edit secrets before go-live."
    else
      echo "Error: missing $ENV_FILE" >&2
      exit 1
    fi
  fi
  load_env_file "$ENV_FILE"
  # shellcheck source=deploy/public-host.sh
  source "$ROOT/deploy/public-host.sh"
  resolve_public_urls

  export APP_PORT="${APP_PORT:-4510}"
  export HOST="${HOST:-127.0.0.1}"
  export APP_BASE_PATH="$(normalize_path "${APP_BASE_PATH:-/case-management}")"
  export STATIC_DIR="${STATIC_DIR:-$ROOT/web/dist}"
  export BRANDING_DIR="${BRANDING_DIR:-$ROOT/branding}"
  export VITE_API_BASE_URL="${VITE_API_BASE_URL:-${APP_BASE_PATH}/api}"
  export VITE_BASE_PATH="${VITE_BASE_PATH:-$APP_BASE_PATH}"
  export VITE_USE_MOCK_AUTH="${VITE_USE_MOCK_AUTH:-false}"

  if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
    export DATABASE_URL="$(
      python3 "$ROOT/deploy/build-database-url.py" \
        "${POSTGRES_USER:-case_management}" \
        "$POSTGRES_PASSWORD" \
        "${POSTGRES_HOST:-127.0.0.1}" \
        "${POSTGRES_PORT:-5432}" \
        "${POSTGRES_DB:-case_management}"
    )"
  elif [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: set POSTGRES_PASSWORD or DATABASE_URL in $ENV_FILE." >&2
    exit 1
  fi
  if [[ "$DATABASE_URL" == *"@postgres:"* ]]; then
    export DATABASE_URL="$(
      python3 "$ROOT/deploy/build-database-url.py" \
        "${POSTGRES_USER:-case_management}" \
        "$POSTGRES_PASSWORD" \
        "${POSTGRES_HOST:-127.0.0.1}" \
        "${POSTGRES_PORT:-5432}" \
        "${POSTGRES_DB:-case_management}"
    )"
    echo "    Adjusted DATABASE_URL for bare-metal (removed docker hostname postgres)"
  fi

  if [[ "${JWT_SECRET:-}" == "change-me-use-openssl-rand-hex-32" || -z "${JWT_SECRET:-}" ]]; then
    echo "Error: set JWT_SECRET in $ENV_FILE before running production." >&2
    echo "  Example: openssl rand -hex 32" >&2
    exit 1
  fi
  if [[ "${POSTGRES_PASSWORD:-}" == "change-me-postgres-password" || -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "Error: set POSTGRES_PASSWORD in $ENV_FILE before running production." >&2
    exit 1
  fi

  echo "    Env file : $ENV_FILE"
  echo "    Listen   : http://${HOST}:${APP_PORT}${APP_BASE_PATH}/"
  echo "    Public   : ${PUBLIC_URL:-"(set PUBLIC_HOST)"}"
}

ensure_seed_json() {
  local dest="$ROOT/api/seed-data/en.json"
  if [[ -f "$dest" ]]; then
    return 0
  fi
  if [[ -f "$ROOT/web/src/i18n/locales/en.json" ]]; then
    cp "$ROOT/web/src/i18n/locales/en.json" "$dest"
    echo "    Seed i18n: api/seed-data/en.json"
  fi
}

install_python_deps() {
  echo "==> Python virtualenv + dependencies..."
  local venv="$ROOT/api/.venv"
  if [[ ! -x "$venv/bin/python" ]]; then
    python3 -m venv "$venv"
  fi
  "$venv/bin/pip" install -q --upgrade pip
  "$venv/bin/pip" install -q -r "$ROOT/api/requirements.txt"
}

install_npm_deps() {
  echo "==> Installing npm dependencies..."
  if [[ -f package-lock.json ]]; then
    if ! npm_config_production=false npm ci --include=dev; then
      echo "    npm ci failed (lock out of sync?) — running npm install..."
      npm_config_production=false npm install --include=dev
    fi
  else
    npm_config_production=false npm install --include=dev
  fi
}

build_frontend() {
  echo "==> Building React frontend..."
  if [[ ! -x "$ROOT/node_modules/.bin/vite" && ! -x "$ROOT/web/node_modules/.bin/vite" ]]; then
    echo "Error: vite not installed (expected after npm ci --include=dev)." >&2
    exit 1
  fi
  VITE_API_BASE_URL="$VITE_API_BASE_URL" \
    VITE_BASE_PATH="$VITE_BASE_PATH" \
    VITE_USE_MOCK_AUTH="$VITE_USE_MOCK_AUTH" \
    npm run build -w web
  echo "    Static assets: $ROOT/web/dist"
}

ensure_built_assets() {
  if [[ "$DO_BUILD" -eq 0 ]]; then
    echo "==> Skipping build (--no-build)"
    if [[ ! -f "$ROOT/web/dist/index.html" ]]; then
      echo "Error: web/dist/index.html missing; run without --no-build once." >&2
      exit 1
    fi
    return 0
  fi
  build_frontend
}

wait_for_postgres() {
  if ! command -v pg_isready >/dev/null 2>&1; then
    echo "==> pg_isready not found; skipping database wait"
    return 0
  fi
  local host="${POSTGRES_HOST:-127.0.0.1}"
  local port="${POSTGRES_PORT:-5432}"
  echo "==> Waiting for PostgreSQL at ${host}:${port}..."
  local attempts=0
  while (( attempts < 30 )); do
    if pg_isready -h "$host" -p "$port" >/dev/null 2>&1; then
      echo "    PostgreSQL ready"
      return 0
    fi
    sleep 1
    attempts=$((attempts + 1))
  done
  echo "Error: PostgreSQL not ready at ${host}:${port}. Create role/database or start postgresql." >&2
  echo "  See deploy/README-DEPLOY.md — PostgreSQL setup." >&2
  exit 1
}

port_in_use() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port "
    return $?
  fi
  return 1
}

free_port() {
  local port=$1
  if ! port_in_use "$port"; then
    return 0
  fi
  echo "==> Port $port in use — stopping listeners..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "$port/tcp" 2>/dev/null || true
    sleep 0.5
    fuser -k -KILL "$port/tcp" 2>/dev/null || true
    sleep 0.2
  fi
  if port_in_use "$port"; then
    echo "Error: port $port is still in use." >&2
    exit 1
  fi
}

wait_for_url() {
  local url=$1
  local attempts=0
  while (( attempts < 60 )); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "    Health OK: $url"
      return 0
    fi
    sleep 0.5
    attempts=$((attempts + 1))
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

start_with_pm2() {
  require_pm2
  local ecosystem="$ROOT/deploy/ecosystem.config.cjs"
  echo "==> Starting Case Management Platform with PM2..."
  pm2 delete case-management-app >/dev/null 2>&1 || true
  free_port "$APP_PORT"
  mkdir -p "$ROOT/logs"
  pm2 start "$ecosystem"
  local health_url="http://127.0.0.1:${APP_PORT}${APP_BASE_PATH}/api/health"
  if ! wait_for_url "$health_url"; then
    pm2 logs case-management-app --lines 50 --nostream >&2 || true
    exit 1
  fi
  pm2 status
  echo ""
  echo "Production stack running (PM2):"
  echo "  App   : http://127.0.0.1:${APP_PORT}${APP_BASE_PATH}/"
  echo "  API   : http://127.0.0.1:${APP_PORT}${APP_BASE_PATH}/api"
  echo "  Docs  : http://127.0.0.1:${APP_PORT}${APP_BASE_PATH}/api/docs"
  if [[ -n "${PUBLIC_URL:-}" ]]; then
    echo "  Public: ${PUBLIC_URL}/"
  fi
  echo "  Logs  : $ROOT/logs  (pm2 logs case-management-app)"
  echo ""
  echo "  pm2 save && pm2 startup   # persist after reboot"
  echo "  sudo bash deploy/configure-nginx.sh"
}

main() {
  require_linux
  [[ "$INSTALL_SYSTEM" -eq 1 ]] && install_system_packages
  require_node
  require_python
  [[ "$USE_PM2" -eq 1 ]] && require_pm2
  prepare_env
  bash "$ROOT/deploy/setup-postgres.sh"
  ensure_seed_json
  install_python_deps
  install_npm_deps
  ensure_built_assets
  wait_for_postgres
  if [[ "$USE_PM2" -eq 1 ]]; then
    start_with_pm2
  else
    echo "Error: bare-metal mode requires --pm2 (foreground uvicorn not implemented)." >&2
    exit 1
  fi
}

main "$@"
