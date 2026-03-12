#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${APP_URL:-}" ]]; then
  echo "APP_URL is required for smoke tests" >&2
  exit 1
fi

base_url="${SMOKE_BASE_URL:-${APP_URL}}"
base_url="${base_url%/}"
app_url="${APP_URL%/}"
cookie_file="$(mktemp)"
trap 'rm -f "${cookie_file}"' EXIT

echo "Checking health endpoint on ${base_url}..."
health="$(curl -fsS "${base_url}/healthz")"
if [[ "${health}" != "ok" ]]; then
  echo "Unexpected /healthz response: ${health}" >&2
  exit 1
fi

base_host="$(printf '%s' "${base_url}" | awk -F/ '{print $3}')"
app_host="$(printf '%s' "${app_url}" | awk -F/ '{print $3}')"
if [[ "${base_host}" != "${app_host}" ]]; then
  echo "Skipping authenticated smoke checks because hosts differ:"
  echo "  SMOKE_BASE_URL host: ${base_host}"
  echo "  APP_URL host:        ${app_host}"
  echo "Health check passed."
  exit 0
fi

echo "Logging in with bootstrap token..."
curl -fsSL -c "${cookie_file}" "${base_url}/login/xyz" -o /dev/null

echo "Updating authenticated user state..."
patch_response="$(
  curl -fsS -b "${cookie_file}" \
    -X PATCH "${base_url}/_/account" \
    -H "content-type: application/json" \
    --data '{"anonymized":true}'
)"

if ! printf "%s" "${patch_response}" | rg -q '"anonymized":true'; then
  echo "PATCH /_/account did not return anonymized=true" >&2
  exit 1
fi

echo "Verifying account page renders persisted user flag..."
account_page="$(curl -fsS -b "${cookie_file}" "${base_url}/account")"
if ! printf "%s" "${account_page}" | rg -q '"anonymized":true'; then
  echo "GET /account page data is missing anonymized=true" >&2
  exit 1
fi

echo "Smoke test passed."
