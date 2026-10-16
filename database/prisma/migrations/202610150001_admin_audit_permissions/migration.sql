BEGIN;
-- También protege instalaciones que aplican Prisma sin deploy-migrate.mjs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eventanilla_api') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "AdministrativeAuditLog" FROM eventanilla_api;
  END IF;
END $$;
COMMIT;
