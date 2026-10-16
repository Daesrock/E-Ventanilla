# Integración con API vigente

Base de producción: `https://api-ventanilla.daesrock.dev/v1/`.
Contratos: `contracts/admin-api.endpoints.json`; entrega y despliegue:
`contracts/entrega-web-api-2026-10-16.md` (rutas relativas a la raíz del repositorio).

## Dos modos explícitos

- **Acceso institucional:** correo o CURP y contraseña → `/bff/auth/login` →
  `/bff/admin/me`. El rol, los permisos y las sedes se resuelven en API.
  `AdminProvider` mantiene identidad en memoria React; recargar vuelve a consultar
  la cookie HttpOnly. Los módulos reales no usan `DemoProvider` para completar datos.
- **Demostración:** datos ficticios de `DemoProvider` conservados para pruebas
  automatizadas y sesiones existentes. La pantalla de acceso ya no ofrece perfiles
  de demostración: solo el acceso institucional.

## BFF

- Token opaco exclusivamente en memoria del servidor; cookie con ID independiente,
  `Path=/bff`, HttpOnly, SameSite=Strict y Secure en producción.
- Comprobación de Origin/Sec-Fetch-Site en todas las mutaciones, incluido PATCH.
- Allowlist explícita de métodos/rutas administrativas; conserva consultas y paginación.
- Reenvía `message`, `code` y `fieldErrors` de errores 4xx; mensajes genéricos en 5xx.
- CSV se transmite como archivo; no se transforma en JSON.
- Logout revoca en API y elimina cookie/store incluso si falla la confirmación remota.
- `administrativeAccess: false` en la respuesta histórica de autenticación es solo
  compatibilidad del diagnóstico: la autorización del panel se consulta en `admin/me`.
- El store es de un solo proceso. Reiniciar o cambiar de instancia requiere volver a ingresar.
- Desarrollo permite HTTP únicamente hacia loopback; producción exige HTTPS.

## Módulos reales

| Pantalla    | API relativa a `/v1`                                      | Consideraciones                                                           |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Sesión      | `admin/me`                                                | Rol objeto, permisos y alcance; nunca rol elegido en el cliente           |
| Sedes       | `admin/branches`                                          | Lista completa dentro del alcance; filtros locales                        |
| Responsable | `admin/staff`, `admin/branches/:id/head`                  | Consulta todas las páginas de candidatos; envía UUID o null explícito     |
| Oferta      | `admin/branches/:id/procedures`                           | PATCH solo de asociaciones cambiadas; revisión, descarte y aviso al salir |
| Catálogo    | `admin/procedures`                                        | `cost` string o null; null = por confirmar, cero = gratuito               |
| Horarios    | `admin/branches/:id/time-slots`, `admin/time-slots/:id`   | `occupied` no se envía; conflictos y capacidad validados por API/BD       |
| Personal    | `admin/staff`                                             | Paginación real; alta/edición solo root                                   |
| Citas       | `admin/appointments`, `admin/appointments/:id/attendance` | Paginación real; asistencia solo con perfil técnico y permiso             |
| Mostradores | `admin/branches/:id/counters`                             | Nuevo en esta entrega; listado para registrar llegada                     |
| Reportes    | `admin/reports`, `admin/reports/export.csv`               | Paginación de pantalla; exportación del conjunto filtrado completo        |

Campos de sede: `municipality: {code,name}`, responsable independiente, contactos nullable.
El formulario real agrupa datos generales, contacto, ubicación (mapa OpenStreetMap sin
API key: clic o marcador + búsqueda de dirección) y publicación. `latitude`/`longitude`
opcionales se envían juntas o se limpian con null; Android las usa para ordenar sedes
cercanas. Publicar exige sourceKey, URL HTTPS, SHA-256 corroborado y fecha; el formulario solicita estos datos.
El acceso ciudadano, registro y recuperación conservan sus contratos existentes.

## Reportes y atención

- Fecha programada en `America/Mexico_City`; intervalo inclusivo.
- Ciudadanos únicos dentro de la cohorte de citas del periodo.
- Llegadas y atenciones finalizadas pertenecen a esa misma cohorte, incluso si el
  evento ocurrió otro día. No son conteos de eventos independientes del periodo.
- Promedios solo con tiempos completos, fin >= inicio; sin datos → null/`—`.
- CSV: todas las filas filtradas y solo columnas seleccionadas; escape y neutralización en API.
- Atención registra llegada, inicio y fin. No cambia `Appointment.status` ni inventa estados.

## Límites actuales

La cuenta real ROOT la aprovisiona el propietario; los accesos locales no existen
automáticamente en el VPS. El alta de cuentas de jefes de ventanilla sigue reservada
a root; el departamento asigna responsables por API desde cada sede. La **Alta
asistida se retiró de la interfaz** para no confundir la operación; el script
`scripts/provision-counter-head.mjs` (verificado localmente) permanece como
herramienta del operador para casos puntuales. El listado de mostradores no permite
darlos de alta: para registrar llegada deben existir mostradores activos y un perfil
CounterStaff. No se agregan endpoints de gestión de permisos, auditoría o
transiciones de estado de citas.
