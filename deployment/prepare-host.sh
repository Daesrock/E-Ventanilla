#!/bin/sh
set -eu
base=/home/ubuntu/e-ventanilla
test "$(realpath "$base")" = /home/ubuntu/e-ventanilla
test ! -e "$base/secrets/api_database_url"
chmod 600 "$base/incoming/secrets.tar.gz"
install -d -m 0700 -o root -g root "$base/secrets"
tar -xzf "$base/incoming/secrets.tar.gz" -C "$base/secrets"
# El directorio privado sólo permite acceso al administrador. Los bind mounts
# individuales son de sólo lectura y deben ser legibles por los UID de Docker.
find "$base/secrets" -type f -exec chmod 0444 {} +
chown -R root:root "$base/secrets"
tar -xzf "$base/incoming/source.tar.gz" -C "$base/app"
chown -R ubuntu:ubuntu "$base/app"
rm -f "$base/incoming/secrets.tar.gz"
cd "$base/app/deployment"
if [ ! -e .env ]; then cp .env.example .env; fi
docker compose --env-file .env config --quiet
