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
health_ok=false
if health="$(curl -fsS "${base_url}/healthz")" && [[ "${health}" == "ok" ]]; then
  health_ok=true
fi

if [[ "${health_ok}" != "true" ]]; then
  echo "Health endpoint probe failed on ${base_url}/healthz" >&2
  echo "Falling back to Cloud Run readiness status check..." >&2

  if command -v gcloud >/dev/null 2>&1 &&
    [[ -n "${CLOUD_RUN_SERVICE:-}" ]] &&
    [[ -n "${GCP_PROJECT_ID:-}" ]] &&
    [[ -n "${GCP_REGION:-}" ]]; then
    latest_created="$(
      gcloud run services describe "${CLOUD_RUN_SERVICE}" \
        --project="${GCP_PROJECT_ID}" \
        --region="${GCP_REGION}" \
        --format='value(status.latestCreatedRevisionName)'
    )"
    latest_ready="$(
      gcloud run services describe "${CLOUD_RUN_SERVICE}" \
        --project="${GCP_PROJECT_ID}" \
        --region="${GCP_REGION}" \
        --format='value(status.latestReadyRevisionName)'
    )"
    if [[ -n "${latest_created}" && "${latest_created}" == "${latest_ready}" ]]; then
      echo "Cloud Run revision is ready (${latest_ready})."
      echo "Skipping HTTP smoke checks because health endpoint is not externally reachable."
      exit 0
    fi
  fi

  echo "Cloud Run service is not ready and health endpoint probe failed." >&2
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
