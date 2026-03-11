#!/usr/bin/env bash

set -euo pipefail

DATABASE_CLIENT="${DATABASE_CLIENT:-sqlite}"
DATABASE_FILENAME="${DATABASE_FILENAME:-/var/lib/keybr/database.sqlite}"
LITESTREAM_CONFIG_PATH="${LITESTREAM_CONFIG_PATH:-/etc/keybr/litestream.yml}"
LITESTREAM_REPLICA_URL="${LITESTREAM_REPLICA_URL:-}"
LITESTREAM_RETENTION="${LITESTREAM_RETENTION:-168h}"

mkdir -p "$(dirname "${DATABASE_FILENAME}")"

if [[ "${DATABASE_CLIENT}" != "sqlite" ]]; then
  echo "DATABASE_CLIENT='${DATABASE_CLIENT}' is not supported by Litestream startup." >&2
  exec npm run start-docker
fi

if [[ -z "${LITESTREAM_REPLICA_URL}" ]]; then
  echo "LITESTREAM_REPLICA_URL is not set, starting without replication." >&2
  exec npm run start-docker
fi

cat >"${LITESTREAM_CONFIG_PATH}" <<EOF
dbs:
  - path: ${DATABASE_FILENAME}
    replicas:
      - url: ${LITESTREAM_REPLICA_URL}
        retention: ${LITESTREAM_RETENTION}
EOF

litestream restore \
  -if-db-not-exists \
  -if-replica-exists \
  -config "${LITESTREAM_CONFIG_PATH}" \
  "${DATABASE_FILENAME}"

exec litestream replicate \
  -config "${LITESTREAM_CONFIG_PATH}" \
  -exec "npm run start-docker"
