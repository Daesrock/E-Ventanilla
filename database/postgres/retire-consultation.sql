-- Solo después de comprobar la conexión de administración. Sin CASCADE.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='consultation' AND (c.relkind <> 'v' OR c.relname NOT IN ('users','challenges','sessions','mail_jobs'))) THEN
    RAISE EXCEPTION 'consultation contiene objetos inesperados; revisar manualmente.';
  END IF;
  IF EXISTS (SELECT FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid
    WHERE r.rolname='eventanilla_readonly' AND d.deptype='o') THEN
    RAISE EXCEPTION 'El rol de consulta posee objetos; no se retirará.';
  END IF;
END $$;
DROP VIEW IF EXISTS consultation.users;
DROP VIEW IF EXISTS consultation.challenges;
DROP VIEW IF EXISTS consultation.sessions;
DROP VIEW IF EXISTS consultation.mail_jobs;
DROP SCHEMA IF EXISTS consultation;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='eventanilla_readonly') THEN
    EXECUTE 'DROP OWNED BY eventanilla_readonly RESTRICT';
    EXECUTE 'DROP ROLE eventanilla_readonly';
  END IF;
END $$;
COMMIT;
