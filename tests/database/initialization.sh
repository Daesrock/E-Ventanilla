#!/bin/sh
# Comprueba el entrypoint real en un clúster efímero sin red ni datos personales.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
container="eventanilla-init-check-$(date +%s)-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  case "$temporary" in /tmp/tmp.*) rm -rf -- "$temporary" ;; esac
}
trap cleanup EXIT INT TERM
chmod 700 "$temporary"
for name in postgres migration api manager backup; do
  openssl rand -hex 32 > "$temporary/${name}_password"
  chmod 644 "$temporary/${name}_password"
done
docker run -d --name "$container" --network none --memory 1g \
  --tmpfs /var/lib/postgresql:rw,size=512m \
  -e POSTGRES_USER=eventanilla_admin -e POSTGRES_DB=eventanilla \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password \
  -e 'POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=scram-sha-256' \
  --mount "type=bind,source=$temporary/postgres_password,target=/run/secrets/postgres_password,readonly" \
  --mount "type=bind,source=$temporary/migration_password,target=/run/secrets/migration_password,readonly" \
  --mount "type=bind,source=$temporary/api_password,target=/run/secrets/api_password,readonly" \
  --mount "type=bind,source=$temporary/manager_password,target=/run/secrets/manager_password,readonly" \
  --mount "type=bind,source=$temporary/backup_password,target=/run/secrets/backup_password,readonly" \
  --mount "type=bind,source=$root/database/postgres/01-roles.sh,target=/docker-entrypoint-initdb.d/01-roles.sh,readonly" \
  --mount "type=bind,source=$root/database/postgres/manager.sql,target=/project/manager.sql,readonly" \
  postgres:18-bookworm@sha256:afc7e2d441324c0388fa80c3d24f733b4194a4eb7f47dd8ee2b08eb1a24a647c >/dev/null
ready=false
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U eventanilla_admin -d eventanilla >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo 'No terminó la inicialización aislada.' >&2
  docker logs "$container" 2>&1 | awk 'tolower($0) !~ /password/' | tail -n 20 >&2
  exit 1
fi
docker exec -i "$container" sh -c 'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -U eventanilla_admin -d eventanilla -v ON_ERROR_STOP=1' <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('eventanilla_migrator','eventanilla_manager','eventanilla_api','eventanilla_backup')) <> 4 THEN
    RAISE EXCEPTION 'Faltan roles operativos';
  END IF;
  IF NOT pg_has_role('eventanilla_manager','eventanilla_migrator','USAGE') OR has_schema_privilege('eventanilla_api','public','CREATE') THEN
    RAISE EXCEPTION 'Permisos iniciales incorrectos';
  END IF;
  IF EXISTS (SELECT FROM pg_authid WHERE rolname LIKE 'eventanilla_%' AND rolcanlogin AND rolpassword NOT LIKE 'SCRAM-SHA-256$%') THEN
    RAISE EXCEPTION 'Falta SCRAM';
  END IF;
END $$;
SQL
docker exec "$container" sh -c 'PGPASSWORD="$(cat /run/secrets/manager_password)" psql -h 127.0.0.1 -U eventanilla_manager -d eventanilla -v ON_ERROR_STOP=1 -c "SELECT current_user;"'
echo 'OK inicialización Docker desde cero, SCRAM y conexión de administración.'
