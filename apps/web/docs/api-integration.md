# Integración con API vigente

Fuente de contrato: `info/desarrollador-panel-web.md`, confirmado como vigente por el equipo. URL configurada por defecto: `https://api-ventanilla.daesrock.dev/v1/`.

## Endpoints conectados

| BFF del panel                     | API compartida               | Comportamiento                                        |
| --------------------------------- | ---------------------------- | ----------------------------------------------------- |
| GET `/bff/health`                 | GET `health`                 | Estado del proceso                                    |
| GET `/bff/ready`                  | GET `ready`                  | Disponibilidad de PostgreSQL vía API                  |
| GET `/bff/catalog/status`         | GET `catalog/status`         | Corroboración del catálogo                            |
| GET `/bff/catalog/municipalities` | GET `catalog/municipalities` | Catálogo público oficial                              |
| POST `/bff/auth/login`            | POST `auth/login`            | `identifier`, `password`; token retenido en servidor  |
| GET `/bff/auth/me`                | GET `auth/me`                | Consulta con token guardado y salida pública filtrada |
| POST `/bff/auth/logout`           | POST `auth/logout`           | Revocación remota y cierre local                      |

No se conecta `auth/register`: registra ciudadanos, no jefes. Recuperación/verificación están documentadas en API, pero el prototipo no presenta formularios reales para ellas: faltan contratos completos de campos y no son necesarias para selección de perfil ficticio.

## Sesiones reales

Login de API devuelve token opaco, `expiresAt` y usuario. BFF crea ID web aleatorio independiente. No decodifica token como JWT, no lo entrega al frontend ni guarda credenciales en almacenamiento del navegador. Cookie tiene alcance `/bff/auth`; HttpOnly, SameSite=Strict y Secure en producción. POST comprueba Origin y Sec-Fetch-Site. Logout intenta revocar en API; si falla, elimina sesión local y comunica falta de confirmación remota.

`administrativeAccess: false` se devuelve siempre: contrato vigente no incluye roles/permisos administrativos. Prueba de sesión no modifica el perfil ficticio del prototipo.

Salir desde navbar cierra perfil de demostración e intenta cerrar/revocar sesión API opcional. Si BFF no está disponible, se comunica que no se pudo confirmar cierre remoto.

## Funciones simuladas

Sedes, catálogo de trámites, oferta por sede, horarios, cupos, cuentas de jefes, citas, asistencia, resultado y reportes usan almacén local. No se escriben datos a API ni PostgreSQL. Las reglas se inspiran en esquema recibido, pero nombres de estados de demo no prueban enumeraciones reales del dominio.

Vista ciudadana dentro de sede es un preview local de reglas propuestas: sede/trámite publicados y activos, asociación activa. Debe alinearse con API antes de uso real.

## Reportes

- Filtro temporal: **fecha programada de cita** en `America/Mexico_City`.
- Intervalo: días inicial/final inclusive.
- Personas: `COUNT DISTINCT citizenId` en conjunto filtrado.
- Asistencia: existencia de llegada registrada en la cita del conjunto.
- Atención finalizada: existencia de fecha de fin.
- Promedios: solo tiempos completos, fin mayor/igual a inicio; sin datos devuelve `—`, no cero.
- Por tanto, asistencia/atención son resultados de la **cohorte de citas** del periodo, no conteos independientes de eventos ocurridos en ese mes.
- CSV: todos los resultados filtrados, únicamente columnas seleccionadas, escapado de comillas y neutralización de fórmulas.

## Pendientes contractuales

Root y alta administrativa; identidad/rol/permiso/ámbito; consultas y mutaciones administrativas de sedes, responsables, catálogo, oferta, horarios; citas/atención; consultas agregadas con definiciones y paginación reales. No crear una segunda autoridad de esquema o autenticación para resolver estos pendientes.
