# Trabajo pendiente

Archivo de continuación para la siguiente sesión. El resumen ejecutivo vive en [project-context.md](project-context.md); aquí está **solo lo que falta y el orden acordado**.

Última actualización: 15 de octubre de 2026.

## Flujo acordado con el equipo

- **Base de datos:** PostgreSQL vive únicamente en el VPS. El propietario aplica los cambios manualmente allá; no hay base local.
- **API:** se desarrolla y prueba localmente en esta carpeta; cuando funcione, se despliegan sus cambios al VPS.
- **Android:** no se modifica. La API nueva es aditiva y conserva los contratos `/v1/auth/*` y `/v1/catalog/*`.
- **Web:** hoy es prototipo con datos simulados; se conecta módulo por módulo cuando existan endpoints reales.

## Hecho (no repetir)

- Migración `database/prisma/migrations/202610140001_administration/migration.sql`: campos opcionales de `AdministrativeStaff`, tabla `AdministrativeAuditLog`, rol `ROOT`, 18 permisos, matriz `RolePermission` e índices de reporte. SQL transaccional y defensivo (`IF NOT EXISTS` / `ON CONFLICT`).
- `database/prisma/schema.prisma` actualizado y validado con Prisma 7.10.0 (incluye los índices nuevos).
- Web simplificada y verificada: lint, formato, typecheck, `docs:check`, 13 pruebas Vitest + 8 Playwright.

## Pendiente, en orden

### 1. Base de datos en VPS (lo aplica el propietario)

1. Hacer **respaldo recuperable** antes de cualquier cambio.
2. Revisar `database/prisma/migrations/202610140001_administration/migration.sql` y ejecutarlo con un rol autorizado (psql o pgAdmin). Es un solo bloque `BEGIN/COMMIT`; si algo falla, no deja cambios a medias.
3. Si se aplica manualmente (sin `prisma migrate deploy`), registrar el estado para que el historial de Prisma quede consistente:

   ```sh
   cd apps/api
   bun node_modules/prisma/build/index.js migrate resolve --applied 202610140001_administration
   ```

4. Verificar en SQL (solo lectura):

   ```sql
   -- Campos opcionales
   SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_name = 'AdministrativeStaff'
     AND column_name IN ('street','exteriorNumber','neighborhood','postalCode','socialSecurityNumber');
   -- Rol y permisos
   SELECT code FROM "Role" WHERE code = 'ROOT';
   SELECT r.code AS rol, count(*) FROM "RolePermission" rp
   JOIN "Role" r ON r.id = rp."roleId" GROUP BY r.code ORDER BY r.code;
   -- Matriz esperada: ROOT 18, DEPARTMENT_HEAD 13, COUNTER_HEAD 8
   -- Auditoría
   SELECT to_regclass('public."AdministrativeAuditLog"');
   ```

### 2. Entorno local para desarrollar API

- **Decidir** cómo habrá base para pruebas: (a) base de pruebas en VPS + túnel SSH, (b) PostgreSQL local con Docker, (c) PostgreSQL local nativo. Recomendado: (a) para migraciones y datos reales.
- Documentar la variable privada `DATABASE_URL` local (nunca versionada).
- **Instalar Bun 1.4.2** en esta máquina: hoy no está disponible y la API lo exige (`bun run db:validate`, `bun run test`, `bun run build`).

### 3. API · Etapa 1 — autorización administrativa

- Guard que reutilice `AuthService.authenticate` y resuelva rol, permiso y ámbito desde la base (jamás desde el cliente).
- `GET /v1/admin/me`: identidad administrativa, permisos y sedes asignadas.
- **Aprovisionamiento de la primera cuenta ROOT:** definir mecanismo controlado (script interno, no endpoint público).
- Pruebas: ciudadano rechazado en `/v1/admin/*`; regresión de contratos actuales (`auth`, `catalog`).

### 4. API · Etapa 2 — personal

- `GET/POST /v1/admin/staff` y `PATCH /v1/admin/staff/:id`.
- Alta transaccional: `User` + `AdministrativeStaff` + perfil (`CounterHead`/`DepartmentHead`). **Nunca reutilizar `auth/register`.**
- Escribir en `AdministrativeAuditLog` (acción, recurso, resultado).
- DTO administrativo: definir campos obligatorios reales (CURP y municipio hoy obligatorios en `User`; domicilio/NSS ya son opcionales).

### 5. API · Etapa 3 — sedes y trámites

- CRUD `/v1/admin/branches` y asignación de responsable `/v1/admin/branches/:id/head`.
- `/v1/admin/procedures` (costo central único) y oferta `/v1/admin/branches/:id/procedures`.
- Publicación exige fuente, URL `https://`, `sha256` y fecha (check de BD ya lo impone).
- Aditivo público: `GET /v1/catalog/branches/:id/procedures` (Android actual todavía no lo consume).

### 6. API · Etapa 4 — horarios

- `/v1/admin/branches/:id/time-slots` (GET/POST) y `PATCH /v1/admin/time-slots/:id`.
- `occupied` **jamás** se edita por API (trigger lo deriva); validar horas, superposición y `capacity >= occupied`.

### 7. API · Etapa 5 — citas y reportes

- Consultas administrativas de citas y atención; reportes agregados con exportación y mismo ámbito que la consulta.
- **Definir estados y transiciones** de cita antes de exponer acciones (hoy `status` es texto libre en el repositorio).
- Reportes: filtro por fecha programada en `America/Mexico_City`; distinguir citas, ciudadanos únicos y asistencias.

### 8. Web — conexión real

- BFF: ampliar cookie de `/bff/auth` a `/bff/*`; mapear `emailVerified` (API) ↔ `emailVerifiedAt`; propagar `fieldErrors` de la API a los formularios.
- Sustituir mocks módulo a módulo, conservando el diseño simple y agregando estados de carga/error/vacío.
- Decidir qué pasa con el perfil de demostración cuando exista acceso real.

### 9. Verificación antes de desplegar

- `bun run db:validate`, `bun run test` y `bun run build` en entorno con Bun.
- Regresión Android (unitarias e instrumentadas) o, como mínimo, contrato HTTP congelado.
- `npm --prefix apps/web run check:api` y recorridos web completos.
- Despliegue de API solo con: respaldo previo, migración aplicada y permisos `runtime.sql` verificados.

## Decisiones abiertas

1. **Alta de jefes:** qué campos pedirá el formulario real de root (CURP y municipio son obligatorios en `User`; NSS/domicilio ya no).
2. **Atención:** `Attendance.staffId` exige perfil `CounterStaff`. ¿El jefe de ventanilla registra llegada/inicio/fin (con perfil técnico) o solo consulta?
3. **Root real:** mecanismo de creación de la primera cuenta.
4. **Base de pruebas:** ¿en VPS o contenedor local?

## Comandos rápidos

```powershell
# Web
npm --prefix apps/web run dev
npm --prefix apps/web test
npm --prefix apps/web run docs:check

# Esquema (sin Bun, usando la versión fijada)
npx --yes prisma@7.10.0 validate --schema database/prisma/schema.prisma
```

## Referencias

- [project-context.md](project-context.md) — contexto único: objetivo, decisiones y plan.
- [api-integration.md](api-integration.md) — contrato API vigente y funciones simuladas.
- [file-map.md](file-map.md) — inventario de cada archivo.
