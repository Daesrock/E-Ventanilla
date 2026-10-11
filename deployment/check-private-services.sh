#!/bin/sh
set -eu
cd /home/ubuntu/e-ventanilla/app/deployment
docker compose --env-file .env exec -T database sh -c 'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql --username eventanilla_admin --dbname eventanilla --set ON_ERROR_STOP=1' < ../database/postgres/check-permissions.sql
docker compose --env-file .env exec -T database sh -c 'PGPASSWORD="$(cat /run/secrets/manager_password)" psql --username eventanilla_manager --host 127.0.0.1 --dbname eventanilla --set ON_ERROR_STOP=1 --command "SELECT count(*) AS accounts FROM \"User\";"'
docker compose --env-file .env exec -T api bun -e "const r=await fetch('http://127.0.0.1:3000/v1/ready'); console.log('ready status',r.status);if(!r.ok)process.exit(1); const c=await fetch('http://127.0.0.1:3000/v1/catalog/municipalities'); console.log('catalog status',c.status);if(!c.ok)process.exit(1);"
docker compose --env-file .env exec -T pgadmin /venv/bin/python3 -c 'import urllib.request; r=urllib.request.urlopen("http://127.0.0.1:8080/misc/ping"); print("pgAdmin status",r.status)'
docker compose --env-file .env ps -a
