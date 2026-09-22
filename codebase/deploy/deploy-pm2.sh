#!/usr/bin/env bash
# Case Management Platform — bare-metal deploy with PM2 (no Docker)
#
# Usage (from install root, e.g. /var/www/case-management):
#   cp deploy/.env.example deploy/.env
#   # Edit deploy/.env — JWT_SECRET, POSTGRES_PASSWORD, PUBLIC_HOST
#   chmod +x deploy/deploy-pm2.sh run-production.sh start.sh
#   ./deploy/deploy-pm2.sh --install-system-deps   # first time only
#   ./deploy/deploy-pm2.sh
#   ./deploy/deploy-pm2.sh --no-build

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/run-production.sh" --pm2 "$@"
