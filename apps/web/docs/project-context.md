# Contexto único del proyecto web

Documento de continuidad: objetivo, decisiones, estado y plan de integración. Si retomas este trabajo con otro asistente, este es el primer archivo que debe leerse junto con `README.md` de la aplicación.

## 1. Objetivo

Panel administrativo para el **Departamento de Gestión Empresarial y Ventanillas Integrales** de la Comisión Estatal de Simplificación Administrativa. Una sola dependencia, sedes VUGE/VIM por municipio, citas para trámites gubernamentales.

| Perfil                   | Responsabilidad                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Root**                 | Preparar sedes y cuentas iniciales; dar de alta jefes.                                                       |
| **Jefe de departamento** | Asignar jefes de ventanilla a sedes, configurar trámites por sede y supervisar resultados de la dependencia. |
| **Jefe de ventanilla**   | Consultar y configurar información autorizada de sus sedes; aportar información operativa.                   |

Decisiones cerradas con el equipo:

- **Costos centrales:** un costo por trámite, igual en todas las sedes (`Procedure.cost`). La oferta por sede se controla con `BranchProcedure.active`.
- **Reportes automáticos:** se calculan al consultar (periodo, municipio, VUGE/VIM, sede, trámite, estado), con campos seleccionables y exportación CSV. No hay captura mensual de cifras.
- **Android no se rompe:** la API nueva será aditiva; los contratos ciudadanos y de catálogo existentes no cambian.
- **Una dependencia:** sin multi-dependencia en esta etapa.
- **Interfaz simple:** una tarea principal por vista, información secundaria desplegable, formularios agrupados con errores junto al campo.

## 2. Estructura del proyecto (esta carpeta)

```text
E-Ventanilla/
├── apps/web/          ← panel administrativo (React + Vite + BFF Express)
├── apps/api/          ← API NestJS + Prisma
├── apps/android/      ← aplicación móvil (no modificar en esta etapa)
├── database/          ← esquema Prisma, migraciones y permisos SQL
├── graphify-out/      ← grafo de dependencias (generado desde API+Android)
├── contracts/         ← contratos de campos compartidos con Android
└── deployment/, scripts/, tests/   ← despliegue y verificación
```

El logo entregado se conserva en `apps/web/public/assets/logos/dependencia-original.png`; el resto de insumos recibidos quedó resumido aquí y en `docs/api-integration.md`.

Regla vigente: **aquí se trabaja la web y la API juntas, preservando Android.**

## 3. Estado actual

### Web (prototipo funcional, datos simulados)

- Rutas con `DashboardLayout` (navbar, sidebar, footer) y `AuthLayout`.
- Inicio con 3 indicadores y accesos por tarea; Sedes con secciones Información/Trámites/Horarios.
- Formularios agrupados (`FormSection`), obligatorios marcados, errores junto al campo (`Field`), acciones visibles en modal.
- Reportes con periodo/sede visibles, filtros y estadísticas bajo demanda (`Disclosure`).
- Perfiles de demostración (root, jefe de departamento, jefe de ventanilla) con alcance simulado en `src/features/auth/policy.ts`.
- BFF (`apps/web/server/`): GET públicos reales, login/me/logout de API con token en memoria y cookie HttpOnly independiente.
- Verificación: typecheck, lint, prettier, docs:check, 13 pruebas Vitest + 8 recorridos Playwright; GET reales contra API responden 200.

### Base de datos (preparada el 14 de octubre de 2026)

Migración nueva: `database/prisma/migrations/202610140001_administration/migration.sql` y cambios en `database/prisma/schema.prisma`. **Estado: preparada y validada; pendiente de aplicar en el VPS por el propietario (ver [pending-work.md](pending-work.md)).**

| Cambio             | Detalle                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campos opcionales  | `AdministrativeStaff`: `street`, `exteriorNumber`, `neighborhood`, `postalCode`, `socialSecurityNumber` ahora `NULL` permitido (formato sigue validado si hay dato). |
| Tabla nueva        | `AdministrativeAuditLog`: actor, acción, tipo y id de recurso, sede opcional, resultado (`completed/rejected/failed`), metadata JSONB, fecha.                        |
| Rol nuevo          | `ROOT` con `hierarchyLevel = 100`.                                                                                                                                   |
| Permisos           | 18 códigos `staff.*`, `branch.*`, `offer.manage`, `procedure.*`, `slot.*`, `appointment.*`, `report.read`, `audit.read`, `permission.manage`.                        |
| Matriz             | ROOT: todos. DEPARTMENT_HEAD: 13 (asigna responsables, config trámites/horarios, consulta citas/reportes). COUNTER_HEAD: 8 (config local de sus sedes, consulta).    |
| Índices de reporte | `Appointment(branchId, scheduledAt)` y `Attendance(branchId, arrivedAt)`.                                                                                            |

Notas operativas:

- La migración se ejecuta con `eventanilla_migrator`; la API mantiene revocadas sus escrituras sobre `Role`/`Permission`/`RolePermission`.
- La **cuenta real de root** se provisiona por operación controlada del propietario (no existe endpoint de registro de personal todavía). Pendiente: definir mecanismo (script de arranque con credenciales de manager).
- `bun` no está instalado en la máquina de desarrollo web actual; validar con `bun run db:validate` y `bun run test` en un entorno con Bun 1.4.2.

## 4. Plan de integración (etapas)

1. **Contratos y autorización** — pruebas de regresión Android + guard administrativo (`AuthService.authenticate` + rol/permiso/ámbito). Endpoint nuevo `GET /v1/admin/me` (identidad, permisos, sedes). No tocar `/auth/me`.
2. **Acceso real web** — sustituir selector demo por login API; BFF amplía cookie a `/bff/*`; mapear `emailVerified` (API) vs `emailVerifiedAt`; errores de campos API → formularios.
3. **Personal** — `GET/POST /v1/admin/staff`, `PATCH /v1/admin/staff/:id`; alta transaccional User + AdministrativeStaff + perfil; nunca reutilizar `auth/register`.
4. **Sedes y trámites** — `/v1/admin/branches`, `/branches/:id/head`, `/procedures`, `/branches/:id/procedures`; añadir `GET /v1/catalog/branches/:id/procedures` (aditivo). Respetar regla de publicación con fuente/hash.
5. **Horarios** — `/v1/admin/branches/:id/time-slots` (+PATCH); `occupied` sigue siendo derivado por trigger, jamás editable.
6. **Citas y reportes** — consultas administrativas + exportación; estados/transiciones definidos en API antes de exponer acciones.
7. **Conexión web** — reemplazar mocks módulo por módulo conservando diseño simple; adaptadores para diferencias de contrato (costo texto/null, nombres de campos).

## 5. Reglas de compatibilidad con Android (no romper)

- Bearer opaco, `token`/`user` en login, recuperación de dos pasos que reenvía el mismo código.
- `lastName` legado obligatorio en respuestas; apellidos separados opcionales.
- Catálogo público: `{ items }` completo sin paginación obligatoria; detalle con objeto directo; `cost` texto o `null` (null ≠ gratis); `requirements`/`officeHours` como texto.
- Catálogo filtra `active && published` en servidor; Android ignora estados editoriales.
- Rutas administrativas nuevas viven bajo `/v1/admin/*`; no alterar códigos HTTP, `fieldErrors` (mapa campo→texto) ni estados de verificación.
- Toda autorización se aplica a rutas nuevas; el acceso ciudadano queda intacto.

## 6. Pendientes de decisión

- **Datos de alta de jefes:** modelo `User` exige CURP y municipio; confirmar qué campos pedirá el formulario real de root (y si NSS/domicilio quedan fuera definitivamente).
- **Atención:** `Attendance.staffId` exige perfil `CounterStaff`. Definir si el jefe de ventanilla registra llegada/inicio/fin (opción: perfil técnico CounterStaff con su misma identidad) o solo consulta.
- **Root real:** mecanismo de aprovisionamiento de la primera cuenta.
- **Proxy de desarrollo:** alinear `APP_ORIGIN` con `localhost` o `127.0.0.1` según el navegador.

## 7. Cómo ejecutar y verificar

```powershell
# Web (requiere Node 22.12+)
npm --prefix apps/web ci
npm --prefix apps/web run assets
npm --prefix apps/web run dev        # http://127.0.0.1:5173

# Calidad web
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run format:check
npm --prefix apps/web run docs:check
npm --prefix apps/web test
npm --prefix apps/web run test:e2e
npm --prefix apps/web run check:api  # GET públicos reales

# API (requiere Bun 1.4.2; no instalado en esta máquina)
cd apps/api
bun run db:validate
bun run test
```

## 8. Documentos de apoyo

- [pending-work.md](pending-work.md) — trabajo pendiente en orden, con flujo BD/VPS y decisiones abiertas.
- [api-integration.md](api-integration.md) — contrato API vigente y funciones simuladas.
- [routes-and-roles.md](routes-and-roles.md) — rutas y matriz demostrativa.
- [design-system.md](design-system.md) — paleta, logo, patrón y criterios de simplicidad.
- [architecture.md](architecture.md) — capas y flujos del prototipo.
- [file-map.md](file-map.md) — inventario de cada archivo.
