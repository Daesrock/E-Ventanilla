#!/bin/sh
set -eu
export PGPASSWORD="$(cat /run/secrets/postgres_password)"
export EV_MIGRATION_PASSWORD="$(cat /run/secrets/migration_password)"
export EV_API_PASSWORD="$(cat /run/secrets/api_password)"
export EV_BACKUP_PASSWORD="$(cat /run/secrets/backup_password)"
export EV_MANAGER_PASSWORD="$(cat /run/secrets/manager_password)"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv migration_password EV_MIGRATION_PASSWORD
\getenv api_password EV_API_PASSWORD
\getenv backup_password EV_BACKUP_PASSWORD
CREATE ROLE eventanilla_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'migration_password';
CREATE ROLE eventanilla_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'api_password';
CREATE ROLE eventanilla_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'backup_password';
REVOKE ALL ON DATABASE eventanilla FROM PUBLIC;
GRANT CONNECT ON DATABASE eventanilla TO eventanilla_migrator, eventanilla_api, eventanilla_backup;
GRANT USAGE ON SCHEMA public TO eventanilla_api, eventanilla_backup;
GRANT CREATE ON DATABASE eventanilla TO eventanilla_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO eventanilla_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT SELECT ON TABLES TO eventanilla_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
\getenv manager_password EV_MANAGER_PASSWORD
\i /project/manager.sql
ALTER ROLE eventanilla_api SET statement_timeout = '20s';
ALTER ROLE eventanilla_api SET lock_timeout = '5s';
SQL
