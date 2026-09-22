#!/usr/bin/env bash
# Stage a deploy folder for Linux PM2 — zip it yourself before uploading.
# Output: dist/case-management-staging/ (extract flat into /var/www/case-management)
# Run from codebase/: bash deploy/create-archive.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${ROOT}/.." && pwd)"
STAGING="${REPO_ROOT}/dist/case-management-staging"
INSTALL_ROOT="/var/www/case-management"

cd "${ROOT}"

echo "==> Normalizing source scripts to LF (Windows-safe)"
normalize_lf_tree() {
  local target=$1
  if command -v python3 >/dev/null 2>&1; then
    python3 "${ROOT}/deploy/normalize-lf.py" "${target}"
  elif command -v python >/dev/null 2>&1; then
    python "${ROOT}/deploy/normalize-lf.py" "${target}"
  elif command -v py >/dev/null 2>&1; then
    py -3 "${ROOT}/deploy/normalize-lf.py" "${target}"
  else
    echo "    Warning: python not found; run deploy/normalize-lf.py before packaging" >&2
  fi
}
normalize_lf_tree "${ROOT}"

echo "==> Staging files to ${STAGING}"
rm -rf "${STAGING}"
mkdir -p "${STAGING}"

copy_tree() {
  local src="$1"
  local dest="$2"
  mkdir -p "${dest}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude 'node_modules' \
      --exclude 'dist' \
      --exclude '.env' \
      --exclude '.venv' \
      --exclude '__pycache__' \
      --exclude '*.pyc' \
      --exclude '.pytest_cache' \
      --exclude '.vite' \
      --exclude 'coverage' \
      --exclude 'logs' \
      --exclude '.run-production' \
      "${src}/" "${dest}/"
  else
    tar -C "${src}" \
      --exclude=node_modules \
      --exclude=dist \
      --exclude=.env \
      --exclude=.venv \
      --exclude=__pycache__ \
      --exclude='*.pyc' \
      --exclude=.vite \
      --exclude=coverage \
      --exclude=logs \
      --exclude=.run-production \
      -cf - . | tar -C "${dest}" -xf -
  fi
}

copy_tree "${ROOT}/api" "${STAGING}/api"
copy_tree "${ROOT}/web" "${STAGING}/web"
copy_tree "${ROOT}/deploy" "${STAGING}/deploy"

cp "${ROOT}/package.json" "${ROOT}/package-lock.json" "${STAGING}/"
cp "${ROOT}/run-production.sh" "${STAGING}/"
cp "${ROOT}/start.sh" "${STAGING}/"
cp "${ROOT}/README-SERVER.txt" "${STAGING}/"
if [[ -f "${ROOT}/.dockerignore" ]]; then
  cp "${ROOT}/.dockerignore" "${STAGING}/"
fi

mkdir -p "${STAGING}/branding" "${STAGING}/logs" "${STAGING}/api/seed-data"
if [[ -f "${ROOT}/web/src/i18n/locales/en.json" ]]; then
  cp "${ROOT}/web/src/i18n/locales/en.json" "${STAGING}/api/seed-data/en.json"
fi
if [[ -f "${REPO_ROOT}/Docs/openapi.yaml" ]]; then
  cp "${REPO_ROOT}/Docs/openapi.yaml" "${STAGING}/api/openapi.yaml"
fi

chmod +x \
  "${STAGING}/start.sh" \
  "${STAGING}/run-production.sh" \
  "${STAGING}/deploy/deploy-pm2.sh" \
  "${STAGING}/deploy/configure-nginx.sh" \
  "${STAGING}/deploy/create-archive.sh" \
  "${STAGING}/deploy/setup-postgres.sh" \
  2>/dev/null || true

echo "==> Normalizing staged shell scripts to LF"
normalize_lf_tree "${STAGING}"

echo ""
echo "Done: ${STAGING}"
du -sh "${STAGING}" 2>/dev/null || ls -ld "${STAGING}"
cat <<EOF

Next steps (on your machine):
  1. Zip the contents of dist/case-management-staging/ (not the parent dist folder).
  2. Copy the zip to the Ubuntu server.

On the server:
  sudo mkdir -p ${INSTALL_ROOT}
  sudo unzip -o your-archive.zip -d ${INSTALL_ROOT}
  cd ${INSTALL_ROOT}
  sudo bash start.sh

PostgreSQL: start.sh provisions local role/database automatically (see deploy/README-DEPLOY.md).
Then: pm2 save && pm2 startup

EOF
