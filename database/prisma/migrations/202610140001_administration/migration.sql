-- Preparación administrativa del panel: auditoría, rol root y matriz de permisos.
-- Ejecuta con eventanilla_migrator; la API mantiene revocadas sus escrituras sobre
-- "Role", "Permission" y "RolePermission" (ver database/permissions/runtime.sql).
BEGIN;

-- El alta administrativa de jefes no exige domicilio ni NSS; se conservan las
-- restricciones de formato (staff_postal, staff_social_security) cuando existan datos.
ALTER TABLE "AdministrativeStaff"
  ALTER COLUMN "street" DROP NOT NULL,
  ALTER COLUMN "exteriorNumber" DROP NOT NULL,
  ALTER COLUMN "neighborhood" DROP NOT NULL,
  ALTER COLUMN "postalCode" DROP NOT NULL,
  ALTER COLUMN "socialSecurityNumber" DROP NOT NULL;

-- Auditoría administrativa: quién cambió qué, sobre qué recurso y con qué resultado.
CREATE TABLE IF NOT EXISTS "AdministrativeAuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" UUID,
    "branchId" UUID,
    "outcome" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeAuditLog_pkey" PRIMARY KEY ("id")
);

DO $audit_constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrativeAuditLog_outcome_check') THEN
    ALTER TABLE "AdministrativeAuditLog" ADD CONSTRAINT "AdministrativeAuditLog_outcome_check"
      CHECK ("outcome" IN ('completed', 'rejected', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrativeAuditLog_actorUserId_fkey') THEN
    ALTER TABLE "AdministrativeAuditLog" ADD CONSTRAINT "AdministrativeAuditLog_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrativeAuditLog_branchId_fkey') THEN
    ALTER TABLE "AdministrativeAuditLog" ADD CONSTRAINT "AdministrativeAuditLog_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$audit_constraints$;

CREATE INDEX IF NOT EXISTS "AdministrativeAuditLog_actorUserId_createdAt_idx"
  ON "AdministrativeAuditLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdministrativeAuditLog_branchId_createdAt_idx"
  ON "AdministrativeAuditLog"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdministrativeAuditLog_createdAt_idx"
  ON "AdministrativeAuditLog"("createdAt");

-- Índices de consulta para reportes por sede y periodo.
CREATE INDEX IF NOT EXISTS "Appointment_branchId_scheduledAt_idx"
  ON "Appointment"("branchId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Attendance_branchId_arrivedAt_idx"
  ON "Attendance"("branchId", "arrivedAt");

-- Permisos administrativos. El código es estable; la descripción puede corregirse
-- solo mediante otra migración, nunca desde la API.
INSERT INTO "Permission" ("id", "code", "description") VALUES
  (md5('perm:staff.read')::uuid, 'staff.read', 'Consultar cuentas de personal'),
  (md5('perm:staff.create')::uuid, 'staff.create', 'Dar de alta cuentas de personal administrativo'),
  (md5('perm:staff.update')::uuid, 'staff.update', 'Actualizar o desactivar cuentas de personal'),
  (md5('perm:permission.manage')::uuid, 'permission.manage', 'Administrar roles y permisos de la plataforma'),
  (md5('perm:branch.read')::uuid, 'branch.read', 'Consultar sedes de la dependencia'),
  (md5('perm:branch.create')::uuid, 'branch.create', 'Crear sedes VUGE y VIM'),
  (md5('perm:branch.update')::uuid, 'branch.update', 'Actualizar información y responsable de sedes'),
  (md5('perm:offer.manage')::uuid, 'offer.manage', 'Configurar trámites disponibles por sede'),
  (md5('perm:procedure.read')::uuid, 'procedure.read', 'Consultar el catálogo de trámites'),
  (md5('perm:procedure.create')::uuid, 'procedure.create', 'Crear trámites del catálogo central'),
  (md5('perm:procedure.update')::uuid, 'procedure.update', 'Actualizar el catálogo central de trámites'),
  (md5('perm:slot.read')::uuid, 'slot.read', 'Consultar horarios y cupos por sede'),
  (md5('perm:slot.create')::uuid, 'slot.create', 'Crear horarios y cupos de atención'),
  (md5('perm:slot.update')::uuid, 'slot.update', 'Actualizar o desactivar horarios y cupos'),
  (md5('perm:appointment.read')::uuid, 'appointment.read', 'Consultar citas y atención por sede'),
  (md5('perm:appointment.update')::uuid, 'appointment.update', 'Actualizar estados de citas dentro de su alcance'),
  (md5('perm:report.read')::uuid, 'report.read', 'Consultar reportes y exportaciones'),
  (md5('perm:audit.read')::uuid, 'audit.read', 'Consultar el registro de auditoría administrativa')
ON CONFLICT ("code") DO NOTHING;

-- Rol raíz para preparación inicial; su cuenta real se provisiona por operación
-- controlada del propietario, nunca mediante el registro público de ciudadanos.
INSERT INTO "Role" ("id", "code", "name", "hierarchyLevel", "active")
VALUES (md5('role:ROOT')::uuid, 'ROOT', 'Root · preparación inicial', 100, true)
ON CONFLICT ("code") DO NOTHING;

-- Matriz de permisos por rol de aplicación.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
JOIN "Permission" p ON
  r.code = 'ROOT'
  OR (
    r.code = 'DEPARTMENT_HEAD'
    AND p.code IN (
      'staff.read', 'branch.read', 'branch.update', 'offer.manage',
      'procedure.read', 'procedure.create', 'procedure.update',
      'slot.read', 'slot.create', 'slot.update',
      'appointment.read', 'appointment.update', 'report.read'
    )
  )
  OR (
    r.code = 'COUNTER_HEAD'
    AND p.code IN (
      'branch.read', 'branch.update',
      'slot.read', 'slot.create', 'slot.update',
      'appointment.read', 'appointment.update', 'report.read'
    )
  )
ON CONFLICT DO NOTHING;

COMMIT;
