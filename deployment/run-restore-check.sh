#!/bin/sh
set -eu
cd /home/ubuntu/e-ventanilla/app/deployment
test -s /home/ubuntu/e-ventanilla/secrets/rclone.conf
compose() { docker compose --env-file .env --profile restore "$@"; }
# Sólo se elimina la base aislada y su volumen anónimo al concluir.
# Las redes y los volúmenes de producción no se tocan.
cleanup() { compose stop restore-db >/dev/null; compose rm -f -v restore-db >/dev/null; }
trap cleanup EXIT HUP INT TERM
compose up -d --wait restore-db
compose run --rm restore-check
