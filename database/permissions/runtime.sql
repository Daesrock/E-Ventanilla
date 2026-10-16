GRANT USAGE ON SCHEMA public TO eventanilla_api, eventanilla_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO eventanilla_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eventanilla_api;
REVOKE ALL ON public._prisma_migrations FROM eventanilla_api;
-- La API consulta catálogos y autorizaciones; sus credenciales no los editan.
REVOKE INSERT, UPDATE, DELETE ON "Role", "Permission", "RolePermission", "Municipality" FROM eventanilla_api;
-- La API agrega auditorías; no puede alterar ni borrar las ya registradas.
DO $$
BEGIN
  IF to_regclass('public."AdministrativeAuditLog"') IS NOT NULL THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "AdministrativeAuditLog" FROM eventanilla_api;
  END IF;
END $$;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO eventanilla_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO eventanilla_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO eventanilla_api;
ALTER DEFAULT PRIVILEGES FOR ROLE eventanilla_migrator IN SCHEMA public GRANT SELECT ON TABLES TO eventanilla_backup;
