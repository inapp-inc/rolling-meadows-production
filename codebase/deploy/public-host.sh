#!/usr/bin/env bash
# Derive PUBLIC_URL and CORS from PUBLIC_HOST + APP_BASE_PATH.
# Source after loading deploy/.env, then call resolve_public_urls.

resolve_public_urls() {
  [[ -n "${PUBLIC_HOST:-}" ]] || return 0

  local scheme="${PUBLIC_SCHEME:-https}"
  scheme="${scheme,,}"
  [[ "$scheme" == "http" || "$scheme" == "https" ]] || scheme="https"

  local host="${PUBLIC_HOST#https://}"
  host="${host#http://}"
  host="${host%/}"

  local base_path="${APP_BASE_PATH:-/case-management}"
  base_path="/${base_path#/}"
  base_path="${base_path%/}"

  export PUBLIC_HOST="$host"
  export APP_BASE_PATH="$base_path"
  export PUBLIC_URL="${PUBLIC_URL:-${scheme}://${host}${base_path}}"
  export CORS_ORIGINS="${CORS_ORIGINS:-${scheme}://${host}}"
}
