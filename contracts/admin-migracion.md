# Integración administrativa: BD y nuevos endpoints

Documento de entrega para el equipo que actualizará la **base de datos** y la **API**.
Explica qué se cambió, para qué sirve, cómo aplicarlo y cómo verificar que quedó bien.
La parte de BD venía preparada desde el 14 de octubre (`202610140001_administration`);
los endpoints administrativos se agregaron después, en la rama `bry`.

## 1. Resumen: qué cambia y en qué ayuda

| Parte             | Cambio                                                                                        | Para qué sirve                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Base de datos     | Migración `202610140001_administration` (aditiva)                                              | Auditoría administrativa, rol `ROOT`, 18 permisos con matriz por rol, índices de reportes y domicilio/NSS opcionales |
| API (nueva)       | Rutas `/v1/admin/*` en módulo `features/admin/` (aditivas)                                     | El panel web deja los datos simulados: sedes, trámites, oferta, horarios, citas, reportes y alta de jefes reales      |
| API (aditiva)     | `GET /v1/catalog/branches/:id/procedures`                                                      | Consulta pública de trámites disponibles por sede (Android actual no la consume)                                      |
| API (sin cambios) | `/v1/auth/*` y `/v1/catalog/*` vigentes                                                        | Android y flujos ciudadanos no se tocan                                                                              |

Regla respetada: **toda la autorización vive en la base** (rol + permiso + alcance).
La API no crea una segunda autoridad ni edita `Role`/`Permission`/`RolePermission`
(PostgreSQL lo mantiene revocado en `database/permissions/runtime.sql`).

## 2. Base de datos: cómo aplicar la migración

Requiere respaldo recuperable antes de cualquier cambio. Se ejecuta con un rol
autorizado (`eventanilla_migrator`) en el VPS; no hay base local.

1. **Respaldo** de PostgreSQL.
2. **Revisar** `database/prisma/migrations/202610140001_administration/migration.sql`.
   Es un solo bloque `BEGIN/COMMIT`: si algo falla, no deja cambios a medias.
3. **Aplicar**, según su forma de trabajo:
   - Normal: `cd apps/api && bun node_modules/prisma/build/index.js migrate deploy`
   - Manual (psql/pgAdmin): ejecutar el SQL y después registrar el estado:
     `bun node_modules/prisma/build/index.js migrate resolve --applied 202610140001_administration`

### Qué contiene exactamente (ya está en el repo)

- `AdministrativeStaff`: `street`, `exteriorNumber`, `neighborhood`, `postalCode` y
  `socialSecurityNumber` ahora aceptan `NULL` (el alta de jefes no exige domicilio ni NSS).
- Tabla `AdministrativeAuditLog`: actor, acción, recurso, sede, resultado
  (`completed/rejected/failed`), metadata JSONB y fecha. **No guarda credenciales ni tokens.**
- Rol `ROOT` (`hierarchyLevel = 100`) y **18 permisos** con matriz:

| Rol               | Permisos                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ROOT              | Los 18                                                                                                                                                      |
| DEPARTMENT_HEAD   | 13: `staff.read`, `branch.read/update`, `offer.manage`, `procedure.read/create/update`, `slot.read/create/update`, `appointment.read/update`, `report.read` |
| COUNTER_HEAD      | 8: `branch.read/update`, `slot.read/create/update`, `appointment.read/update`, `report.read`                                                                |
| CITIZEN / STAFF   | Ninguno administrativo (los endpoints les responden 403)                                                                                                    |

- Índices de reportes: `Appointment(branchId, scheduledAt)` y `Attendance(branchId, arrivedAt)`.

### Verificación SQL (solo lectura)

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'AdministrativeStaff'
  AND column_name IN ('street','exteriorNumber','neighborhood','postalCode','socialSecurityNumber');
-- Matriz esperada: ROOT 18, DEPARTMENT_HEAD 13, COUNTER_HEAD 8
SELECT r.code AS rol, count(*) FROM "RolePermission" rp
JOIN "Role" r ON r.id = rp."roleId" GROUP BY r.code ORDER BY r.code;
SELECT to_regclass('public."AdministrativeAuditLog"');
```

## 3. API: endpoints nuevos

Todos bajo `/v1/admin/*`, con sesión `Bearer` de una cuenta administrativa
(la misma de `/v1/auth/login`). El servidor resuelve rol, permisos y sedes;
el cliente nunca decide su alcance.

| Método | Ruta                                        | Permiso             | Qué hace                                                            |
| ------ | ------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| GET    | `/v1/admin/me`                              | (rol admin)         | Identidad, rol, permisos, perfiles y sedes asignadas                |
| GET    | `/v1/admin/staff`                           | `staff.read`        | Listado de personal con rol, perfiles y sedes                       |
| POST   | `/v1/admin/staff`                           | `staff.create`      | Alta transaccional de jefes (User + AdministrativeStaff + perfil)   |
| PATCH  | `/v1/admin/staff/:id`                       | `staff.update`      | Vigencia, contacto, domicilio y perfil técnico de ventanilla        |
| GET    | `/v1/admin/branches`                        | `branch.read`       | Sedes con municipio, responsable y fuente (según alcance)           |
| POST   | `/v1/admin/branches`                        | `branch.create`     | Alta de sede VUGE/VIM                                               |
| PATCH  | `/v1/admin/branches/:id`                    | `branch.update`     | Datos, contacto, vigencia y publicación (con fuente corroborada)    |
| PATCH  | `/v1/admin/branches/:id/head`               | `branch.update`     | Asigna o retira jefe de ventanilla (solo root/departamento)         |
| GET    | `/v1/admin/branches/:id/procedures`         | `branch.read`       | Oferta de trámites de la sede (incluye inactivos)                   |
| PATCH  | `/v1/admin/branches/:id/procedures`         | `offer.manage`      | Activa/desactiva oferta (nunca borra asociaciones)                  |
| GET    | `/v1/admin/procedures`                      | `procedure.read`    | Catálogo central completo (incluye no publicados)                   |
| POST   | `/v1/admin/procedures`                      | `procedure.create`  | Alta de trámite con costo central                                   |
| PATCH  | `/v1/admin/procedures/:id`                  | `procedure.update`  | Actualiza trámite, costo, vigencia y publicación                    |
| GET    | `/v1/admin/branches/:branchId/time-slots`   | `slot.read`         | Horarios y cupos (`from`/`to` opcionales)                           |
| POST   | `/v1/admin/branches/:branchId/time-slots`   | `slot.create`       | Crea bloque (valida horas y superposición)                          |
| PATCH  | `/v1/admin/time-slots/:id`                  | `slot.update`       | Edita horas, capacidad o vigencia; `occupied` jamás se envía        |
| GET    | `/v1/admin/appointments`                    | `appointment.read`  | Citas con filtros y paginación (`branchId`, `from`, `to`, `status`, `procedureId`, `page`, `pageSize`) |
| POST   | `/v1/admin/appointments/:id/attendance`     | `appointment.update`| Llegada/inicio/fin (`arrive`/`start`/`end`) sobre `Attendance`      |
| GET    | `/v1/admin/reports`                         | `report.read`       | Métricas del periodo + listado paginado; mismo alcance              |
| GET    | `/v1/admin/reports/export.csv`              | `report.read`       | CSV completo (todas las filas filtradas, columnas seleccionables)   |
| GET    | `/v1/catalog/branches/:id/procedures`       | público             | Aditivo público: trámites publicados y activos de una sede          |

Notas de comportamiento:

- **Permisos insuficientes** → 403 con `code: ADMIN_PERMISSION_REQUIRED`;
  cuenta no administrativa → 403 con `code: ADMIN_ACCESS_REQUIRED`.
- **Alcance**: `ROOT` y `DEPARTMENT_HEAD` operan toda la dependencia; `COUNTER_HEAD`
  solo sus sedes asignadas (403 `BRANCH_OUT_OF_SCOPE`).
- **Publicación** de sedes y trámites exige fuente (`sourceKey`, URL `https`,
  `sha256` de 64 hex y fecha), igual que las restricciones de PostgreSQL.
- **Reportes**: citas por fecha programada en `America/Mexico_City`, ciudadanos únicos,
  asistencia por llegada registrada, atención por fecha de fin; promedios solo con
  tiempos completos (`null` cuando no hay datos).
- **Atención**: registrar llegada/inicio/fin exige que la cuenta tenga el perfil
  técnico `CounterStaff` (ver decisiones abiertas, sección 6).
- Todas las mutaciones escriben en `AdministrativeAuditLog`.

Archivos nuevos de la API: `apps/api/src/features/admin/` (auth, guard, decoradores,
auditoría, contratos, tiempo/fechas, publicación, `shared`) más un servicio y controlador
por recurso (`staff`, `branches`, `procedures`, `slots`, `appointments`, `reports`),
el módulo `admin.module.ts` y su registro en `app.module.ts`.
Pruebas nuevas: `apps/api/test/admin.test.mjs`.

## 4. Orden de despliegue recomendado

1. `git pull` de la rama `bry`.
2. `cd apps/api && bun install --frozen-lockfile`
3. `bun run db:validate && bun run test && bun run build` (requiere **Bun 1.4.2**).
4. Respaldo de la BD del VPS.
5. Aplicar migración (sección 2) y verificar SQL.
6. Desplegar/reciclar el proceso de la API con el nuevo `dist`.
7. Ejecutar smoke tests (sección 5).
8. Aprovisionar la primera cuenta `ROOT` (sección 5.3).

> **Estado de verificación:** en la máquina donde se escribió esta entrega **no hay Bun
> ni PostgreSQL local**, así que `bun run test` y `bun run build` quedan **pendientes de
> ejecutar en un entorno con Bun 1.4.2**. Los contratos ciudadanos existentes
> (`bun test test`) siguen cubiertos por las pruebas actuales.

## 5. Smoke tests

### 5.1 Servicios públicos (sin sesión)

```sh
curl -s https://api-ventanilla.daesrock.dev/v1/health
curl -s https://api-ventanilla.daesrock.dev/v1/catalog/branches | head -c 300
# Nuevo (aditivo): trámites de una sede publicada (usar un id real)
curl -s https://api-ventanilla.daesrock.dev/v1/catalog/branches/<UUID>/procedures
```

### 5.2 Panel administrativo (con cuenta administrativa)

```sh
TOKEN=$(curl -s -X POST https://api-ventanilla.daesrock.dev/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"cuenta-admin@dominio.mx","password":"..."}' | jq -r .token)

curl -s https://api-ventanilla.daesrock.dev/v1/admin/me -H "Authorization: Bearer $TOKEN"
curl -s https://api-ventanilla.daesrock.dev/v1/admin/branches -H "Authorization: Bearer $TOKEN"
curl -s "https://api-ventanilla.daesrock.dev/v1/admin/reports?from=2026-10-01&to=2026-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

Comprobar además:

- Una cuenta **ciudadana** en `/v1/admin/me` debe recibir **403**.
- `PATCH /v1/admin/time-slots/:id` con `capacity` menor a `occupied` debe fallar con
  `fieldErrors.capacity`.
- Publicar una sede sin `sourceUrl`/`sha256` debe fallar con `fieldErrors`.
- Cada mutación debe aparecer en `AdministrativeAuditLog`.

### 5.3 Primera cuenta ROOT (aprovisionamiento controlado)

No existe endpoint de alta de root y no se usará `auth/register` (es de ciudadanos).
El hash de contraseña debe estar en el formato de la API: `scrypt$<salt hex 32>$<64 bytes hex>`
(scrypt N=131072, r=8, p=1). Puede generarlo con Node 22+ (sin instalar nada):

```sh
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');c.scrypt('LA-CONTRASENA',s,64,{N:131072,r:8,p:1,maxmem:160*1024*1024},(e,k)=>console.log('scrypt$'+s+'$'+k.toString('hex')))"
```

Después, en SQL (ajustar datos; usar un municipio existente):

```sql
INSERT INTO "User" (id, "firstName", "lastName", curp, email, "passwordHash",
                    municipality, "municipalityCode", "emailVerifiedAt", "roleId")
VALUES (gen_random_uuid(), 'Nombre', 'Apellido Apellido', 'CURP000000HCSXXX00',
        'cuenta-admin@dominio.mx', 'scrypt$...', 'Tuxtla Gutiérrez', '07101', now(),
        (SELECT id FROM "Role" WHERE code = 'ROOT'));

INSERT INTO "AdministrativeStaff" ("userId") VALUES ('<UUID del usuario anterior>');
```

Para un jefe de departamento o de ventanilla conviene usar ya `POST /v1/admin/staff`
con la sesión root (valida CURP, municipio, duplicados y deja auditoría).

## 6. Qué ayuda a habilitar (siguiente etapa del panel web)

- **Sustituir mocks por endpoints reales**: el BFF del panel amplía su cookie a `/bff/*`,
  reenvía el token en memoria y el front reemplaza los datos simulados módulo por módulo
  (catálogo y sedes primero; los mocks quedan solo para lo aún no expuesto).
- **Acceso real**: el selector de perfiles ficticios se reemplaza por el login de API;
  rol, permisos y sedes llegan de `/v1/admin/me`.
- **Operación diaria**: alta de jefes por root, asignación a sedes, horarios con cupo real
  (el trigger de reservas sigue siendo el único que mueve `occupied`), registro de
  atención y reportes con exportación.
- **Trazabilidad**: cada cambio administrativo queda en `AdministrativeAuditLog`.

## 7. Decisiones abiertas (respetadas, no forzadas)

1. **Estados/transiciones de cita**: `Appointment.status` sigue siendo texto libre; la API
   solo registra tiempos en `Attendance` (llegada, inicio, fin). No se inventaron
   enumeraciones nuevas.
2. **Perfil técnico de ventanilla**: `POST/PATCH /v1/admin/staff` puede otorgar el perfil
   `CounterStaff` a un jefe de ventanilla (`counterStaff: true`). La decisión operativa de
   usarlo o dejarlo solo en consulta sigue abierta.
3. **Root real**: mecanismo de aprovisionamiento es el de la sección 5.3 (manual, controlado).
4. **Base de pruebas**: sin definir (VPS con túnel o contenedor local).

## 8. Incidentes y reglas de seguridad

- **No borrar** filas de `Role`/`Permission`/`RolePermission` ni renombrar códigos:
  la API los lee literalmente (p. ej. `branch.read`).
- **No editar `occupied`** a mano: hay un trigger que lo bloquea fuera de las reservas.
- Si la API arranca y todo responde 403 con `ADMIN_ACCESS_REQUIRED`, revisar que la cuenta
  tenga rol administrativo **y** registro en `AdministrativeStaff`.
- Si la migración falla: PostgreSQL no deja cambios a medias; corregir la causa y repetir.
  No hace falta restaurar el respaldo salvo un `COMMIT` ya aplicado con datos erróneos.
- Los logs de la API no serializan errores de base de datos (protección de datos personales).

## 9. Referencias

- `database/prisma/migrations/202610140001_administration/migration.sql` — cambios de BD.
- `contracts/admin-api.endpoints.json` — la lista de endpoints en formato legible por máquina.
- `apps/api/src/features/admin/` — implementación (autorización, auditoría y servicios).
- `apps/web/docs/pending-work.md` y `project-context.md` — plan y estado del panel web.
- `database/permissions/runtime.sql` — qué puede escribir la API en la base.
