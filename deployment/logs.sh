#!/bin/sh
set -eu
cd /home/ubuntu/e-ventanilla/app/deployment
service=${1:-api}
case "$service" in
  api|database|pgadmin|tunnel) ;;
  proxy)
    # Host de E-Ventanilla comprobado en NPM: 10. No consultar otros hosts.
    case "${2:-}" in
      '') exec docker exec nginx-proxy-manager tail -n 100 /data/logs/proxy-host-10_access.log /data/logs/proxy-host-10_error.log ;;
      --follow) exec docker exec nginx-proxy-manager tail -n 100 -f /data/logs/proxy-host-10_access.log /data/logs/proxy-host-10_error.log ;;
      *) echo 'Usa --follow para observar los logs en directo.' >&2; exit 2 ;;
    esac ;;
  *) echo 'Servicio válido: api, database, pgadmin, tunnel o proxy.' >&2; exit 2 ;;
esac
case "${2:-}" in
  '') exec docker compose --env-file .env --profile published logs --timestamps --tail 100 "$service" ;;
  --follow) exec docker compose --env-file .env --profile published logs --timestamps --tail 100 --follow "$service" ;;
  *) echo 'Usa --follow para observar los logs en directo.' >&2; exit 2 ;;
esac
