\set ON_ERROR_STOP on
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('eventanilla_migrator','eventanilla_api','eventanilla_manager','eventanilla_backup')
    AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Un rol operativo tiene privilegios del clúster.';
  END IF;
  IF EXISTS (SELECT FROM pg_authid WHERE rolname LIKE 'eventanilla_%' AND rolcanlogin AND rolpassword NOT LIKE 'SCRAM-SHA-256$%') THEN
    RAISE EXCEPTION 'Una contraseña no usa SCRAM.';
  END IF;
  IF has_schema_privilege('eventanilla_api','public','CREATE') OR has_database_privilege('eventanilla_api',current_database(),'CREATE')
    OR has_table_privilege('eventanilla_api','public._prisma_migrations','SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'La API tiene privilegios estructurales.';
  END IF;
  IF NOT pg_has_role('eventanilla_manager','eventanilla_migrator','USAGE') OR NOT has_schema_privilege('eventanilla_manager','public','CREATE') THEN
    RAISE EXCEPTION 'La administración no puede modificar el proyecto.';
  END IF;
  IF EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='eventanilla_manager' AND m.admin_option) THEN
    RAISE EXCEPTION 'El administrador del proyecto puede otorgar roles.';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tableowner NOT IN ('eventanilla_migrator','eventanilla_manager')) THEN
    RAISE EXCEPTION 'La propiedad de una tabla es incorrecta.';
  END IF;
  IF EXISTS (SELECT FROM pg_tables t WHERE t.schemaname='public' AND t.tablename<>'_prisma_migrations'
    AND NOT has_table_privilege('eventanilla_api',format('%I.%I',t.schemaname,t.tablename),'SELECT')) THEN
    RAISE EXCEPTION 'La API no puede consultar una tabla del proyecto.';
  END IF;
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname='consultation') OR EXISTS (SELECT FROM pg_roles WHERE rolname='eventanilla_readonly') THEN
    RAISE EXCEPTION 'El acceso antiguo sigue presente.';
  END IF;
  IF EXISTS (SELECT FROM pg_tables t WHERE t.schemaname='public' AND NOT has_table_privilege('eventanilla_backup',format('%I.%I',t.schemaname,t.tablename),'SELECT')) THEN
    RAISE EXCEPTION 'El respaldo no puede leer todas las tablas.';
  END IF;
END $$;
SELECT 'Permisos de API, administración y respaldos comprobados' AS result;
