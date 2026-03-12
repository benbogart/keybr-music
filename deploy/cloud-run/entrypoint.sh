#!/usr/bin/env bash

set -euo pipefail

DATABASE_CLIENT="${DATABASE_CLIENT:-sqlite}"
DATABASE_FILENAME="${DATABASE_FILENAME:-/var/lib/keybr/database.sqlite}"
LITESTREAM_CONFIG_PATH="${LITESTREAM_CONFIG_PATH:-/etc/keybr/litestream.yml}"
LITESTREAM_REPLICA_URI="${LITESTREAM_REPLICA_URI:-}"
LITESTREAM_RESTORE_URI="${LITESTREAM_RESTORE_URI:-${LITESTREAM_REPLICA_URI}}"
LITESTREAM_RETENTION="${LITESTREAM_RETENTION:-168h}"

mkdir -p "$(dirname "${DATABASE_FILENAME}")"

if [[ "${DATABASE_CLIENT}" != "sqlite" ]]; then
  echo "DATABASE_CLIENT='${DATABASE_CLIENT}' is not supported by Litestream startup." >&2
  exec npm run start-docker
fi

if [[ -z "${LITESTREAM_REPLICA_URI}" ]]; then
  echo "LITESTREAM_REPLICA_URI is not set, starting without replication." >&2
  exec npm run start-docker
fi

if [[ "${LITESTREAM_REPLICA_URI}" == gcs://* ]]; then
  # Litestream v0.5.9 expects the gs:// scheme.
  LITESTREAM_REPLICA_URI="gs://${LITESTREAM_REPLICA_URI#gcs://}"
  echo "Normalized Litestream replica URI to '${LITESTREAM_REPLICA_URI}'." >&2
fi
if [[ "${LITESTREAM_RESTORE_URI}" == gcs://* ]]; then
  LITESTREAM_RESTORE_URI="gs://${LITESTREAM_RESTORE_URI#gcs://}"
  echo "Normalized Litestream restore URI to '${LITESTREAM_RESTORE_URI}'." >&2
fi

cat >"${LITESTREAM_CONFIG_PATH}" <<EOF
dbs:
  - path: ${DATABASE_FILENAME}
    replica:
      url: ${LITESTREAM_REPLICA_URI}
      retention: ${LITESTREAM_RETENTION}
EOF

# Restore from LITESTREAM_RESTORE_URI (defaults to LITESTREAM_REPLICA_URI).
# This allows preview deployments to seed from the prod database.
restore_config="${LITESTREAM_CONFIG_PATH}"
if [[ "${LITESTREAM_RESTORE_URI}" != "${LITESTREAM_REPLICA_URI}" ]]; then
  restore_config="$(mktemp)"
  cat >"${restore_config}" <<EOF
dbs:
  - path: ${DATABASE_FILENAME}
    replica:
      url: ${LITESTREAM_RESTORE_URI}
EOF
  echo "Restoring from '${LITESTREAM_RESTORE_URI}' (differs from replica URI)." >&2
fi

echo "Preparing SQLite restore from '${LITESTREAM_RESTORE_URI}'..." >&2
litestream restore \
  -if-db-not-exists \
  -if-replica-exists \
  -config "${restore_config}" \
  "${DATABASE_FILENAME}" || {
  echo "Litestream restore failed; continuing startup." >&2
}

echo "Starting Litestream replication..." >&2
litestream replicate \
  -config "${LITESTREAM_CONFIG_PATH}" \
  -exec "npm run start-docker" || {
  echo "Litestream replicate failed; starting app without replication." >&2
  exec npm run start-docker
}
