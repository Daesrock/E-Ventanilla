-- Como administrador del clúster; psql recibe manager_password en privado.
SELECT 'CREATE ROLE eventanilla_manager LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eventanilla_manager') \gexec
ALTER ROLE eventanilla_manager PASSWORD :'manager_password';
ALTER ROLE eventanilla_manager NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT eventanilla_migrator TO eventanilla_manager WITH INHERIT TRUE, SET TRUE, ADMIN FALSE;
GRANT CONNECT ON DATABASE eventanilla TO eventanilla_manager;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_manager IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_manager IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_manager IN SCHEMA public GRANT SELECT ON TABLES TO eventanilla_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_manager REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
