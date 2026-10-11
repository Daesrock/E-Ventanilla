#!/bin/sh
set -eu
cd /home/ubuntu/e-ventanilla/app/deployment
compose() { docker compose --env-file .env --profile operations "$@"; }
compose config --quiet
compose build api migrate backup restore-check
# Una actualización estructural de una base inicializada exige una copia remota.
# La primera instalación vacía se realiza por separado.
test -s /home/ubuntu/e-ventanilla/secrets/rclone.conf
compose run --rm -e BACKUP_MODE=before-migration backup
compose stop api
compose run --rm migrate
compose up -d --wait --no-deps api
compose exec -T api bun -e "const r=await fetch('http://127.0.0.1:3000/v1/ready');if(!r.ok)process.exit(1);"
