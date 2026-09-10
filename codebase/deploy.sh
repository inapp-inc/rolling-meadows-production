#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

APP_PORT="${APP_PORT:-4510}"
APP_BASE_PATH="${APP_BASE_PATH:-/rolling-meadows}"
PUBLIC_URL="${PUBLIC_URL:-https://foundry.inapp.com/rolling-meadows}"
IMAGE="rolling-meadows-app:latest"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== Rolling Meadows deploy ==="
echo "Public URL: ${PUBLIC_URL}"
echo "Listen port: ${APP_PORT}"
echo

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    echo "ERROR: .env not found. Run: cp .env.example .env"
  else
    echo "ERROR: .env not found. Create .env with JWT_SECRET and POSTGRES_PASSWORD."
  fi
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed."
  exit 1
fi

if [[ -f rolling-meadows-app.tar ]]; then
  echo "Loading Docker image from rolling-meadows-app.tar..."
  docker load -i rolling-meadows-app.tar
else
  echo "No tarball found — building image on server..."
  docker compose -f "$COMPOSE_FILE" build
fi

echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

HEALTH_URL="http://127.0.0.1:${APP_PORT}${APP_BASE_PATH}/api/health"
echo "Waiting for health check at ${HEALTH_URL} ..."

for _ in $(seq 1 45); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    echo
    echo "Deploy successful."
    echo "  App:  ${PUBLIC_URL}"
    echo "  API:  ${PUBLIC_URL}/api"
    echo "  Docs: ${PUBLIC_URL}/api/docs"
    exit 0
  fi
  sleep 2
done

echo
echo "ERROR: Health check failed."
docker compose -f "$COMPOSE_FILE" logs --tail=80 app
exit 1
