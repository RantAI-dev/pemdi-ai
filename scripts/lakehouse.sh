#!/usr/bin/env bash
# docker compose for the RantAI Lakehouse stack behind Pemdi-AI.
#
# Runs the lakehouse repo's own docker-compose.yml under a separate project
# name with infra/lakehouse.env, so nothing is written into that repo.
#
# Usage:
#   scripts/lakehouse.sh up        build and start what Pemdi-AI needs
#   scripts/lakehouse.sh start     start the existing images without building
#   scripts/lakehouse.sh init      create the ClickHouse registry (once, after the first up)
#   scripts/lakehouse.sh down      stop it (data volumes are kept)
#   scripts/lakehouse.sh <args>    any other docker compose arguments
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAKEHOUSE_DIR="${LAKEHOUSE_DIR:-$HOME/rantai/RantAI-Lakehouse}"
ENV_FILE="$ROOT/infra/lakehouse.env"

[ -f "$LAKEHOUSE_DIR/docker-compose.yml" ] || { echo "RantAI-Lakehouse not found at $LAKEHOUSE_DIR (set LAKEHOUSE_DIR)" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (copy infra/lakehouse.env.example)" >&2; exit 1; }

export GIT_SHA="${GIT_SHA:-$(git -C "$LAKEHOUSE_DIR" rev-parse HEAD)}"

compose() {
  docker compose -p pemdi-lakehouse --env-file "$ENV_FILE" \
    -f "$LAKEHOUSE_DIR/docker-compose.yml" --profile dagster "$@"
}

# The API, the ClickHouse view of raw tables, and the orchestrator that
# loads uploads. Their dependencies (Postgres, ClickHouse, RustFS,
# Lakekeeper, OpenFGA) come up with them.
SERVICES=(lakehouse-api clickhouse-iceberg-init dagster-code-location dagster-webserver dagster-daemon)

# A fresh ClickHouse has no `lake` registry: the lakehouse creates it on the
# first ingest, but refuses an upload before it exists. This runs the
# registry's own schema code, so the tables are the ones its jobs expect.
init() {
  compose exec -T clickhouse clickhouse-client --multiquery \
    --query "CREATE DATABASE IF NOT EXISTS serving; CREATE DATABASE IF NOT EXISTS silver;"
  compose exec -T dagster-code-location python -c \
    "from dispar_orchestrate import bronze_catalog as b; b._assert_or_create_all(b.ClickHouseTarget.from_env(), b.EXPECTED_SCHEMAS); print('registry siap')"
}

case "${1:-}" in
  init) init ;;
  up)   shift; compose up -d --build "$@" "${SERVICES[@]}" ;;
  start) shift; compose up -d --no-build "$@" "${SERVICES[@]}" ;;
  down) shift; compose down "$@" ;;
  *)    compose "$@" ;;
esac
