# Trabajo pendiente

Actualizado: 16 de octubre de 2026. Trabajo en `bry`, alineado con la API revisada
de `main` (`ddcd9df`). Entrega: `contracts/entrega-web-api-2026-10-16.md`.

## Hecho

- Acceso institucional por contraseña como única entrada del panel; la demostración
  ya no se ofrece desde `/acceso` (permanece solo para pruebas y sesiones existentes).
- Configuración (sesión institucional) reservada a ROOT; los jefes no la ven.
- Texto de acceso: nombre completo del departamento; se retiró el eslogan y el kicker.
- BFF administrativo con cookie `/bff`, lista de rutas/métodos y errores por campo.
- Módulos reales de sedes, responsables, oferta por sede, catálogo, horarios,
  personal, citas y reportes/CSV. Datos reales y ficticios permanecen separados.
- Oferta con filtros, revisión de altas/retiros, descarte y aviso al salir sin guardar.
- Roles/alcance de API controlan navegación y acciones; costo pendiente distinto de gratuito.
- GET `/v1/admin/branches/:id/counters` nuevo; consulta referencias existentes para llegada.
- BD local aislada 55432 y tres cuentas de prueba; accesos en `.tools/web-local-access.json`.
- Aprovisionamiento controlado de ROOT por `scripts/provision-root.mjs`, con Prisma y auditoría.
- Integración real BFF → API → PostgreSQL local verificada. Ningún fixture se envió al VPS.
- `main` (`dd19837`) integrado en `bry`: mostradores revisados y aprovisionamiento
  ROOT único (`root-provisioning.ts` + script en Dockerfile). El endpoint de
  mostradores **ya está desplegado** en producción (401 sin sesión verificado).
- Logo oficial E-Ventanilla reemplaza al recurso anterior (acceso y sidebar; se retiró
  el pipeline `prepare-assets`). En Responsables, el jefe de departamento ya no ve
  cuentas ROOT (regla de presentación alineada con la demostración).
- Horarios: campo de capacidad renombrado a «Cupos del bloque» con ayuda explícita.
- Sedes: formulario por secciones (datos, contacto, ubicación, publicación) con mapa
  OpenStreetMap sin API key para fijar latitud/longitud; la API guarda ambas y Android
  las despliega. Sustituye al editor genérico del panel real.
- Interfaz estilo iOS 18: paleta de plataformas de Chiapas (`#149381`, `#e97ead`,
  `#333333`), radios amplios, sombras suaves, barra translúcida, transiciones breves
  y tarjetas de sede rediseñadas; respeta `prefers-reduced-motion`.
- Emblema de la Comisión Estatal de Simplificación Administrativa (`coesmer.png`)
  restaurado como crédito institucional en menú lateral y pie del acceso.
- Personal: **Alta asistida** para el jefe de departamento: el panel genera un archivo
  privado (JSON) y `scripts/provision-counter-head.mjs` lo aplica con Bun 1.4.2 y la
  conexión autorizada — sin tocar API ni base de datos (verificado localmente: cuenta
  COUNTER_HEAD, perfiles, sede asignada, auditoría y rechazo de duplicados). La
  asignación a sedes la hace el propio departamento desde cada sede. **Mejora futura
  opcional (requiere despliegue de API):** `staff.create`/`staff.update` para
  DEPARTMENT_HEAD limitado a COUNTER_HEAD, para autoservicio directo; la interfaz ya
  está condicionada por permisos.

## Despliegue y validación del responsable

1. Revisar/integrar `bry` en `main` antes de actualizar el checkout del servidor.
2. Desplegar la nueva API (solo cambia listado de mostradores); no hay migración nueva.
   Conservar el overlay OSRM y los permisos SQL ya aplicados.
3. Aprovisionar ROOT con datos reales si aún no existe; crear cuentas de jefes desde
   el panel/API administrativa. Nunca reutilizar el registro ciudadano para ello.
4. Desplegar web y BFF juntos, con HTTPS, API_BASE_URL y APP_ORIGIN del dominio final.
5. Smoke de login/alcance, oferta, responsable y consulta de mostradores con cuentas reales.
6. Corroborar fuentes oficiales para publicar catálogo/sedes; probar atención con citas
   reales de prueba autorizadas y mostradores activos.

## Límites y decisiones

- Estados/transiciones de cita pendientes de definición institucional. No se muestran
  como acciones reales las simulaciones de cancelar/no-presentado/atendido del modo demo.
- El jefe de ventanilla necesita perfil CounterStaff para registrar atención.
- No hay CRUD de mostradores ni UI para permisos/auditoría; listado únicamente.
- Store BFF en memoria: un proceso, reiniciar pierde sesiones web.
- Docker/VPS web requiere instalación/configuración del operador; esta entrega documenta
  el arranque Node + proxy HTTPS, no ejecuta un despliegue remoto.

## Comandos de verificación

```powershell
# API (desde apps/api)
bun run db:validate
bun run test

# Web (desde apps/web)
npm run typecheck
npm run lint
npm run format:check
npm run docs:check
npm test -- --maxWorkers=1
npm run test:e2e
npm run build

# Raíz: prueba integrada, solo BD local 55432 y API local arrancada
bun scripts/check-web-local.mjs
```
