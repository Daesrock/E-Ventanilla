# Entrega web/API administrativa — 16 de octubre de 2026

## 1. Qué se entrega y en qué ayuda

Trabajo en `bry`, alineado con la API desplegada de `main` (`ddcd9df`) mediante
el merge `05bc814`. El panel puede operar con la API real y mantiene la demostración
en un modo explícito separado. Los cambios reales se guardan en PostgreSQL mediante API.

| Cambio                                                  | Utilidad                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Acceso institucional por correo/CURP y contraseña       | Obtiene rol, permisos y sedes desde `admin/me`; el usuario no elige su rol real                      |
| BFF administrativo con cookie `/bff`                    | Reenvía solicitudes permitidas y conserva el token opaco exclusivamente en servidor                  |
| Errores 4xx con `message`, `code`, `fieldErrors`        | El formulario muestra qué campo corregir sin perder la captura                                       |
| Sedes con Información, Responsable, Trámites y Horarios | Concentra la configuración de cada sede en tareas separadas                                          |
| Oferta de trámites por sede                             | Buscar, filtrar, revisar altas/retiros, descartar o guardar y volver a consultar                     |
| Catálogo central                                        | Un costo por trámite para todas las sedes; null es pendiente, cero es gratuito                       |
| Publicación corroborada                                 | Solicita fuente, URL HTTPS, SHA-256 y fecha que ya exige PostgreSQL                                  |
| Personal, citas y reportes                              | Paginación de API, atención por tiempos y CSV de todas las filas filtradas                           |
| Listado de mostradores por sede                         | Permite seleccionar un mostrador existente al registrar una llegada                                  |
| Scripts locales y aprovisionamiento ROOT                | Pruebas repetibles sin cargar fixtures en producción y creación controlada de la primera cuenta real |

El módulo real usa `AdminProvider`/`AdminPanel`. Las pantallas demostrativas anteriores
siguen usando `DemoProvider`; nunca se mezclan registros reales con los ficticios.
La identidad real se mantiene en memoria React y se recupera desde la cookie al recargar.
El BFF conserva comprobación de origen para POST y PATCH, cookie HttpOnly/SameSite=Strict
y Secure en producción. El store actual es de un proceso: reiniciar el BFF exige nuevo login.

## 2. Cambio nuevo de API: solo lectura, sin migración

```http
GET /v1/admin/branches/:id/counters
Authorization: Bearer <sesión administrativa>
```

Permiso: `appointment.read`. Aplica el mismo alcance por sede del resto del módulo.

```json
{
  "items": [{ "id": "UUID-del-mostrador", "number": 1, "active": true }]
}
```

- 401 sin sesión válida.
- 403 si falta permiso o la sede está fuera del alcance.
- 404 si la sede no existe.
- Lista los mostradores existentes ordenados por número; no crea ni modifica registros.
- El selector de llegada muestra únicamente mostradores activos.

Archivos modificados:

- `apps/api/src/features/admin/branches.admin.controller.ts`
- `apps/api/src/features/admin/branches.admin.service.ts`
- Pruebas: `apps/api/test/admin-counters.test.mjs`
- Contrato actualizado: `contracts/admin-api.endpoints.json` (versión 2).

**No hay migraciones nuevas en esta entrega.** Las migraciones
`202610140001_administration` y `202610150001_admin_audit_permissions` provienen
de la integración anterior y ya fueron aplicadas en el VPS según su responsable.
No editar ni volver a ejecutar manualmente esos SQL si ya están registrados.
El comando normal de migración debe indicar que no hay pendientes.
Los contratos `/v1/auth/*` y los catálogos públicos existentes se conservan.

## 3. Estado de verificación

Comprobado en esta máquina, con Bun 1.4.2 y PostgreSQL local aislado en 55432:

- API: 76 pruebas aprobadas; build incluido en `bun run test`.
- Web/BFF: 16 pruebas unitarias aprobadas usando un worker.
- Navegador: 11 recorridos aprobados. Flujo de departamento (oferta, revisión, persistencia y descarte),
  alta de catálogo por root con error por campo y costo pendiente, y ventanilla móvil
  con permisos/alcance; además de los ocho recorridos previos de demostración.
- Integración real BFF → API → PostgreSQL: login, edición de sede, asignar y retirar
  responsable, activar/desactivar oferta con consulta posterior, crear/editar horario,
  alta/edición de catálogo con costo null y cero, consultas de citas, reportes y CSV,
  listado de mostradores y logout.
- Aprovisionamiento ROOT: cuenta, perfil y auditoría creados en BD local;
  repetición rechazada sin cambiar contraseña/hash. La cuenta de esa prueba fue eliminada.

Los recorridos de navegador usan upstream simulado; el script integrado anterior
usa API y PostgreSQL reales locales. Estas pruebas no acreditan un despliegue remoto
ni una sesión administrativa real en producción. Citas/reportes locales sin citas
ejercitan la respuesta vacía; los casos poblados/concurrentes pertenecen a las pruebas
de API e integración que acompañan al módulo revisado.

### Comandos reproducibles

```powershell
# API: desde apps/api
bun install --frozen-lockfile
bun run db:validate
bun run test
bun run format:check

# Web: desde apps/web
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run docs:check
npm test -- --maxWorkers=1
npm run test:e2e
npm run build

# Raíz: requiere la API local arrancada y los accesos locales preparados
bun scripts/check-web-local.mjs
```

Se usó `--maxWorkers=1` para evitar un cierre inesperado del worker de Vitest observado
en Windows. No se desactivan pruebas ni aserciones.

## 4. Qué debe hacer el responsable del despliegue

1. Revisar la entrega de `bry` e integrarla en `main`, conservando los cambios del VPS/OSRM.
2. Actualizar el checkout/artefacto del servidor al commit aprobado.
3. Ejecutar pruebas/build de API con Bun 1.4.2 (comandos anteriores).
4. Desplegar la imagen/proceso API con el procedimiento ya establecido, **conservando
   el overlay OSRM**, secretos, red y permisos SQL. Este cambio no requiere alterar la BD.
5. Comprobar el nuevo GET: sin token debe devolver 401, no `Cannot GET ...`.
6. Aprovisionar una cuenta ROOT real si todavía no existe (sección 5).
7. Desplegar **web y BFF juntos**, como se describe abajo. Servir solo archivos de Vite
   no basta: `/bff/*` necesita el servidor Node.
8. Verificar login real, alcance y operaciones con las cuentas del titular.

### Configuración de la web/BFF en producción

Usar Node 22.12+ o 24+, instalar desde `apps/web` y configurar variables privadas:

```dotenv
NODE_ENV=production
API_BASE_URL=https://api-ventanilla.daesrock.dev/v1/
APP_ORIGIN=https://panel.ejemplo.invalid
PORT=3001
```

Reemplazar `APP_ORIGIN` por el origen exacto aprobado (sin ruta). No copiar `.env`
local, que apunta a `127.0.0.1:3000`. El backend de API y el dominio del panel pueden
ser distintos; el navegador habla solo con el BFF de su mismo origen.

```sh
# Desde apps/web. El arranque actual usa tsx, que está en devDependencies.
npm ci --include=dev
npm run build
npm start
```

Ejecutar `npm start` bajo el supervisor elegido por el operador y publicar mediante
proxy HTTPS al loopback `127.0.0.1:3001`. El BFF sirve tanto `dist` como `/bff` y
resuelve recargas de rutas SPA. Conservar las cabeceras Origin y las cookies.
HTTP hacia API solo está permitido en desarrollo y para loopback; producción exige HTTPS.
La sesión BFF no se comparte entre procesos: esta versión se despliega con un proceso.

## 5. Primera cuenta ROOT real

El aprovisionamiento es una operación del propietario, no un endpoint público.
No usar el SQL de ejemplo retirado de `admin-migracion.md`; omitía `updatedAt`.

Nuevo helper: `scripts/provision-root.mjs`. Requiere checkout del repositorio,
dependencias API instaladas, `apps/api/dist` generado y una conexión de destino
autorizada (`DATABASE_URL` o `DATABASE_URL_FILE`, como en la API).
Puede cargar `apps/api/.env` si existe; **verificar el destino antes de ejecutarlo**.
El script usa el cliente Prisma, DTO de registro, validación de municipio y función
de hash de la propia API. No solicita el registro ciudadano ni crea un perfil Citizen.

Preparar un JSON **privado fuera de Git** con datos corroborados del titular:

| Campo              | Obligatorio                                 |
| ------------------ | ------------------------------------------- |
| `firstName`        | Sí                                          |
| `paternalLastName` | Sí                                          |
| `maternalLastName` | Opcional                                    |
| `curp`             | Sí, formato válido y sin duplicado          |
| `email`            | Sí, sin duplicado                           |
| `municipalityCode` | Sí, clave existente del catálogo de Chiapas |
| `password`         | Sí, política vigente de API                 |

```sh
# Raíz del checkout. El argumento es una ruta, nunca la contraseña.
bun scripts/provision-root.mjs /ruta/privada/titular-root.json
```

Crea User + AdministrativeStaff + auditoría `staff.bootstrap` en una transacción.
Prisma genera UUID/timestamps, incluido `updatedAt`. El correo se considera corroborado
por el operador. Rechaza cuentas existentes y no imprime contraseña/hash.
Después de aprovisionar, gestionar el archivo privado mediante la práctica de secretos
del operador; no copiarlo al repo. Desde ROOT, crear DEPARTMENT_HEAD y COUNTER_HEAD
con el panel o `POST /v1/admin/staff`. Las cuentas locales de prueba no se copian al VPS.

## 6. Verificación posterior en producción

- `GET /v1/health` y `GET /v1/ready` → 200.
- Nuevo GET de mostradores sin sesión → 401, confirma que la ruta está cargada.
- Cuenta ciudadana en `admin/me` → 403; cuenta administrativa activa → identidad y alcance.
- Departamento: consultar sedes y catálogo, asignar un responsable existente y guardar
  una oferta **solo en una sede de prueba autorizada**; volver a consultar y confirmar.
- Ventanilla: sus sedes únicamente y sin edición del catálogo central.
- Comprobar 400 con `fieldErrors`, 403 de permisos/alcance y conflictos 409 en UI.
- Reporte/CSV: mismo periodo y alcance; costo null se muestra pendiente, cero gratuito.
- Registrar llegada solo con perfil CounterStaff y mostrador activo; no cambia el estado de cita.
- Logout y nuevo acceso. Reiniciar el BFF debe requerir autenticarse nuevamente.

## 7. Límites conocidos y retorno a versión anterior

- El listado de mostradores es nuevo; no hay CRUD web/API de mostradores en esta entrega.
  Si la sede no tiene mostradores activos, el operador debe prepararlos para registrar llegadas.
- No se inventaron estados ni transiciones de cancelación/no-presentado/atendido.
- `audit.read` y `permission.manage` permanecen reservados sin pantallas ni endpoints nuevos.
- La demo permanece disponible y marcada como ficticia. La selección de perfil demo
  no concede permisos reales ni cambia una cuenta institucional.
- Este trabajo no ejecuta el despliegue remoto ni aprovisiona usuarios reales en el VPS.
- Si hay una incidencia, volver a las imágenes/artefactos anteriores de API y web/BFF.
  **No revertir ni borrar las migraciones ya aplicadas:** este delta no modifica el esquema.
  El registro de la cuenta inicial, si se creó, es un dato operativo independiente del rollback de código.

## 8. Arranque y debug local

La configuración local usa API en 3000, BFF en 3001, Vite en 5173 y PostgreSQL en 55432.

```powershell
# Raíz: preparar/arrancar la base aislada; ajustar versión instalada de PostgreSQL
$env:POSTGRES_BIN = 'C:\Program Files\PostgreSQL\16\bin'
bun scripts/start-local-db.mjs

# Primera terminal, desde apps/api
bun run db:migrate
bun run build

# Raíz: cuentas/fixtures de prueba (rechaza cualquier BD que no sea loopback:55432)
bun scripts/prepare-web-local.mjs

# API, desde apps/api
bun run dev

# Otra terminal, desde raíz
npm --prefix apps/web run dev
```

Abrir `http://127.0.0.1:5173/acceso`. Accesos privados: `.tools/web-local-access.json`.
El script `prepare-web-local` conserva contraseñas en ese archivo y no las cambia al repetirlo.
Si el archivo privado se perdió pero las cuentas existen, el operador debe restaurarlo
o restablecer esas cuentas locales antes de asumir que las contraseñas nuevas coinciden.

```powershell
# Diagnóstico de API y procesos: no lanzar una segunda instancia si ya está escuchando
curl.exe http://127.0.0.1:3000/v1/health
Get-NetTCPConnection -LocalPort 3000,3001,5173 -State Listen

# Raíz: integración real local
bun scripts/check-web-local.mjs

# Apps/web: depurar un recorrido y su traza
npx playwright test tests/e2e/admin.spec.ts --headed
npx playwright show-trace "ruta-al-trace.zip"
```

En DevTools del navegador, Network muestra `/bff/*`; el token API no aparece en sus
respuestas. La consola del BFF informa conectividad; la consola Nest muestra errores
de la API. Este documento, los scripts y los commits no contienen credenciales locales.
