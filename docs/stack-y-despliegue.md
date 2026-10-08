# Tecnologías acordadas y despliegue previsto

## Estado de las decisiones

El usuario aceptó Kotlin y Jetpack Compose para Android, TypeScript y NestJS para la API y PostgreSQL con Prisma, además de Docker en su VPS. La primera implementación fija Kotlin 2.2.20, AGP 8.13.1, Gradle 8.14, Node.js 24, NestJS 11.2.7 y Prisma 7.10.0. Se validó en desarrollo local; no se desplegó en el VPS. Las instrucciones están en [Primer arranque](primer-arranque.md).

| Parte | Tecnología | Función |
| --- | --- | --- |
| App Android | Kotlin y Jetpack Compose en Android Studio | Pantallas, navegación y estado de la interfaz |
| API | Node.js, TypeScript y NestJS | Acceso, permisos, consultas y reglas de las citas |
| Base de datos | PostgreSQL | Usuarios, sedes, trámites, cupos, citas y atenciones |
| Acceso a datos de la API | Prisma ORM y migraciones | Modelo y evolución reproducible de la base de datos |
| Servidor | VPS Linux aarch64, dos núcleos y 12 GB de RAM | Alojar la API y PostgreSQL |
| Contenedores | Docker, con Docker Compose como propuesta de organización | Ejecutar y configurar los servicios del proyecto |
| Entrada pública | Nginx existente y DNS de Cloudflare | Dirigir las solicitudes del subdominio a la API |
| Envío de correo | Resend, elegido; configuración pendiente | Entregar mensajes de verificación y recuperación generados por la API |
| Panel web | Pendiente, previsto en TypeScript | Administración y atención; última etapa |

Android Studio es el entorno de desarrollo; Kotlin es el lenguaje y Compose construye la interfaz. Se propone una estructura sencilla con pantallas, ViewModels y repositorios para separar interfaz y acceso a datos.

PostgreSQL permite relaciones, restricciones y transacciones, adecuadas para este dominio. Evitar sobrecupos requerirá además diseñar correctamente la operación de reserva con control de concurrencia; elegir el motor por sí solo no resuelve esa regla.

## Organización prevista

- `docs/`: contexto, alcance, reglas y decisiones. Puede leerse y editarse como texto.
- `android/`: proyecto Android Studio, navegación y formularios de acceso; APK debug generado.
- `api/`: proyecto NestJS, cuentas, códigos, sesiones, cola de correo y migraciones PostgreSQL.
- `infra/`: configuración de Docker para base, migraciones y API; integración con Nginx pendiente.
- `scripts/`: arranque de base aislada y API local, parada de base y compilación Android.
- `web/`: panel administrativo futuro. Aún no creado.

Las reglas operativas se definirán con el usuario y el departamento. La documentación y el código se prepararán dentro de esta carpeta; no requieren una herramienta de gestión externa.

## Cómo se conectan las partes

App Android → solicitudes HTTPS → API → PostgreSQL.

La API es un programa que se ejecuta en un servidor; el dominio le da una dirección pública. Android utiliza esa dirección para solicitar datos. Las credenciales de PostgreSQL se configuran en el servidor de la API, no en la aplicación Android.

En desarrollo, la API y PostgreSQL pueden ejecutarse en la computadora. La app usará información corroborada y estados explícitos para los datos pendientes, sin datos ni operaciones ficticios. La dirección de desarrollo dependerá de si se prueba en emulador o teléfono físico. El despliegue público vendrá después de verificar el recorrido conectado con las reglas necesarias confirmadas.

## Aprovechar el VPS y dominio existentes

Infraestructura confirmada por el usuario: VPS Linux aarch64 (ARM64), dos núcleos, 12 GB de RAM y acceso completo. Se usará Docker. Nginx ya está configurado en el VPS y Cloudflare gestiona el dominio daesrock.dev. Se prevé ejecutar la API y PostgreSQL en contenedores separados. Antes de preparar el despliegue se verificará distribución y versión de Linux, espacio disponible, otros servicios y si Nginx se ejecuta en el host o en un contenedor.

Subdominio propuesto para la API: `https://api-ventanilla.daesrock.dev`. Es una propuesta; no se ha creado ni confirmado su disponibilidad. Usar un nombre específico para E-Ventanilla facilita su separación de otros proyectos del dominio.

Recorrido del despliegue propuesto:

1. Preparar imágenes compatibles con ARM64 y la configuración de los contenedores de API y PostgreSQL, incluyendo persistencia de los datos y variables de entorno.
2. Ejecutar las migraciones y cargar únicamente catálogos corroborados, conservando su procedencia. Mantener una conexión privada entre la API y PostgreSQL dentro de Docker.
3. Integrar la API con el Nginx existente: mediante red compartida si Nginx está en Docker, o mediante un puerto local del host si Nginx se ejecuta fuera de Docker. El detalle se definirá después de revisar su configuración.
4. Crear en Cloudflare el registro DNS del subdominio hacia el VPS y verificar HTTPS en el recorrido Cloudflare → Nginx → API según la configuración existente.
5. Configurar Android para utilizar esa URL pública y probar el recorrido conectado.

PostgreSQL quedará en la red privada de los servicios y sus credenciales permanecerán en el servidor. La app accederá únicamente a la API. Se aprovechará Nginx para añadir la ruta del proyecto; el dominio principal y el panel futuro podrán mantener destinos separados.

No se han accedido ni modificado el VPS, el DNS o el dominio. Esta sección describe el despliegue previsto.

## Orden de desarrollo ajustado a la prioridad móvil

Antes de iniciar la implementación se resolverán los requisitos necesarios. Los datos institucionales y las reglas operativas que no puedan corroborarse permanecerán pendientes y no se sustituirán por valores de ejemplo.

1. App Android navegable basada en Figma, con información corroborada y estados de información pendiente.
2. Modelo PostgreSQL, migraciones y API mínima, mientras se completan las pantallas.
3. Conexión de Android y reservas persistentes, una vez corroborados horarios, cupos y reglas de citas; verificar el cumplimiento de esas reglas y permisos.
4. Despliegue de API y base de datos en el VPS Linux del usuario, tras verificarlo.
5. Panel web de operación, administración y reportes.

## Envío de correos de recuperación

R04 se implementó en NestJS y PostgreSQL: cuentas, códigos de recuperación/verificación y cambio de contraseña. Resend tiene integración por API HTTP y una cola persistente para envío con reintentos. `api/.env` está creado y excluido de Git; faltan la clave, el remitente y la verificación real del proveedor. No se ha probado aún la entrega de correos.

Modalidad elegida: código de recuperación por correo introducido en Android. La API valida su uso antes de cambiar la contraseña. Los parámetros técnicos iniciales implementados se registran en [Primer arranque](primer-arranque.md#alcance-y-decisiones-técnicas-iniciales); son distintos de las políticas institucionales pendientes.

La verificación del correo es obligatoria durante el registro. La API mantiene el alta pendiente hasta confirmarla. Se implementó un código introducido en la app también para verificación, como decisión técnica de interfaz, con propósito separado del código de recuperación.

El usuario confirmó que tiene Cloudflare Email Routing, para reenvío de mensajes recibidos. Esa configuración no implementa el envío saliente de recuperaciones. Según la [documentación oficial de Cloudflare Email Service](https://developers.cloudflare.com/email-service/), Email Routing recibe y reenvía mensajes, mientras Email Sending permite envío transaccional por API o SMTP desde el VPS. La documentación consultada sitúa el envío general en el plan Workers Paid y permite gratuitamente envíos a destinos verificados de la propia cuenta; esa excepción no equivale a envío gratuito general a los ciudadanos.

[Resend](https://resend.com/pricing?product=transactional), elegido por el usuario, ofrece un plan gratuito de 3.000 correos mensuales, con máximo de 100 diarios, según los precios consultados en esta revisión. Es un límite del proveedor, no una regla de citas del departamento. Sus [herramientas para Node.js](https://resend.com/docs/send-with-nodejs) permiten integrarlo en NestJS. Para enviar desde el dominio del usuario se requiere [verificar el dominio o subdominio mediante DNS](https://resend.com/docs/dashboard/domains/introduction); antes de configurar esos registros se revisarán los de correo existentes en Cloudflare.

Se usará Resend, conservando Cloudflare para DNS y reenvío. El usuario indicó que ya cuenta con la API key; no se le solicita compartirla en el chat y no se ha configurado su cuenta externa desde este proyecto. El remitente y la verificación del dominio siguen pendientes. La clave se configura en el `.env` del servidor, sin incluirla en Android ni en Git. Las tarifas y límites deben revisarse de nuevo al configurar el servicio.

Las medidas propuestas para el restablecimiento se basan en [OWASP: Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html): secretos seguros, vencimiento, uso único, almacenamiento protegido, controles frente a solicitudes abusivas y respuestas que no revelen si una cuenta existe. El flujo detallado se registra en [R04](requisitos.md#r04-propuesta-de-funcionamiento-y-tecnología).

## Referencias técnicas

- [Arquitectura recomendada de Android](https://developer.android.com/topic/architecture/recommendations)
- [Transacciones en PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Restricciones en PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Primeros pasos de NestJS](https://docs.nestjs.com/first-steps)
- [NestJS con Prisma](https://docs.nestjs.com/recipes/prisma)
- [Despliegue de NestJS](https://docs.nestjs.com/deployment)
- [Requisitos de Prisma en Linux ARM64](https://docs.prisma.io/docs/orm/reference/system-requirements)
- [Distribución Node.js para Linux ARM64](https://nodejs.org/en/download/archive/v22.18.0)
- [Proxy inverso con Nginx](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy)
