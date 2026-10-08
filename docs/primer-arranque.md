# Primera base de E-Ventanilla

La primera etapa ya incluye una app Android navegable y una API NestJS con PostgreSQL. El panel web y las reservas se mantienen para etapas posteriores. No se han cargado ciudadanos, sedes, trámites, citas ni horarios de muestra.

Los nuevos formularios, el catálogo INEGI sin conexión y sus pruebas se documentan en [Acceso y registro](acceso-y-registro.md).

## Abrir la app

En Android Studio, elige **Open** y selecciona `C:/Users/Pardo/Desktop/E-Ventanilla/android`. Deja que se sincronice el proyecto y ejecútalo en un emulador Android.

La compilación inicial usa Gradle 8.14, Android Gradle Plugin 8.13.1 y Kotlin 2.2.20. Selecciona JDK 21 para Gradle en Android Studio; en esta computadora se descargó dentro de `.tools/jdk`. El script `scripts/build-android.ps1` encuentra ese JDK y genera el APK debug.

El APK está en `android/app/build/outputs/apk/debug/app-debug.apk`. Es una compilación de desarrollo, no una versión de publicación.

Inicio, Trámites, Directorio, Mis citas, Notificaciones y Mi perfil están conectados por navegación. Acceso, registro, verificación y recuperación tienen formularios conectados a la API. El directorio, catálogo de trámites y agenda muestran su estado pendiente de corroboración. El catálogo geográfico de municipios de Chiapas procede de INEGI y funciona sin conexión.

Se conservaron los colores, logotipos e iconos de la plantilla de Figma, adaptando tamaño de texto y navegación a componentes nativos. Se omitieron los contactos no corroborados y QR de muestra del pie. Las imágenes son recursos locales; la app no depende de enlaces temporales de Figma.

## Completar Resend

Edita `api/.env`. Completa estas dos variables:

```dotenv
RESEND_API_KEY=
RESEND_FROM=
```

En `RESEND_API_KEY` pega la clave de tu cuenta. En `RESEND_FROM` indica la dirección elegida de tu dominio de envío verificado. No pegues la clave en la app Android, en la documentación o en el chat.

La dirección remitente sigue pendiente de definir. Antes de probar el envío, verifica el dominio en Resend usando los registros DNS que indique su panel. Cloudflare puede conservar el reenvío existente; no se han modificado sus registros desde este proyecto. [Guía oficial de verificación de dominio](https://resend.com/docs/dashboard/domains/introduction).

El `.env` local ya tiene credenciales aleatorias para PostgreSQL y el secreto de protección de códigos. Git ignora este archivo. `.env.example` es la plantilla sin secretos para preparar otro entorno. El servidor informa que el envío no está configurado si falta la clave o el remitente; no simula correos enviados.

## Iniciar la API en esta computadora

Desde la carpeta del proyecto, ejecuta en PowerShell:

```powershell
.\scripts\start-api.ps1
```

El script usa Node.js 24 y pnpm; si no están en la ruta habitual, busca el runtime disponible de Codex en esta computadora. Inicia la base local aislada, aplica las migraciones, compila la API y la ejecuta en desarrollo. No modifica las bases del PostgreSQL que ya tengas configuradas.

La base propia del proyecto está en `.tools/postgres-data` y escucha únicamente en `127.0.0.1:55432`. La API escucha por defecto en `127.0.0.1:3000`. Para detener la API usa Ctrl+C en la terminal donde la iniciaste. Para detener la base local:

```powershell
node scripts/stop-local-db.mjs
```

Si el puerto de la API ya está ocupado por la instancia de desarrollo del proyecto, usa la instancia existente o deténla antes de ejecutar otra. El modo de desarrollo reinicia la API al cambiar `api/.env` o sus archivos compilados. Para cambios TypeScript se necesita volver a compilar; puede mantenerse `pnpm build:watch` en otra terminal dentro de `api`.

## Conectar Android y comprobar el acceso

`android/local.properties` contiene la dirección local de la API para el emulador:

```properties
api.baseUrl=http://10.0.2.2:3000/v1/
```

Ese host es el acceso del emulador a tu computadora. Para un teléfono por USB configura `api.baseUrl=http://127.0.0.1:3000/v1/` y ejecuta `adb -d reverse tcp:3000 tcp:3000` con la depuración USB autorizada. Ejecuta la app desde Android Studio con la API local encendida. La versión de publicación exige HTTPS.

Para probar un registro real, usa tus propios datos y un correo que controles, después de configurar y verificar Resend. El recorrido es: Crear cuenta → Verificar correo → Iniciar sesión con CURP o correo y contraseña → Mi perfil. El registro no concede una sesión antes de verificar el correo. La recuperación usa un código independiente y permite establecer una contraseña nueva; no revela ni envía la anterior.

El envío se solicita a una cola persistente de PostgreSQL. Los códigos quedan cifrados mientras esperan entrega y solo se descifran al enviarlos. La API no espera a que Resend entregue el mensaje para responder a una recuperación; usa una respuesta uniforme para evitar revelar si una cuenta existe. La entrega se reintenta de forma limitada y no se registra el código en las bitácoras.

La sesión Android se conserva únicamente en memoria en esta etapa. Al cerrar el proceso de la app se necesita iniciar sesión de nuevo. La consulta del perfil muestra datos devueltos por una autenticación real, no una persona de muestra. La CURP y el RFC reciben validación de formato, sin consulta a un servicio oficial de identidad.

## Alcance y decisiones técnicas iniciales

El modelo inicial contiene cuentas, sesiones, credenciales de verificación/recuperación y la cola de correo. Se adoptó UUID interno, CURP única y correo único normalizado. No se ha convertido en código todo el modelo institucional: sedes, oferta y citas requieren resolver sus pendientes antes de habilitar esas operaciones.

Los siguientes valores son decisiones técnicas implementadas para el acceso, no políticas de atención del departamento:

| Parámetro | Valor inicial | Configuración |
| --- | --- | --- |
| Longitud del código de acceso | 8 dígitos | API y formularios Android |
| Vigencia del código | 600 segundos | `AUTH_CODE_TTL_SECONDS` |
| Intentos por código | 5 | `AUTH_CODE_ATTEMPTS` |
| Intervalo mínimo de reemisión | 60 segundos | `AUTH_CODE_RESEND_SECONDS` |
| Vigencia máxima de sesión del servidor | 604.800 segundos | `AUTH_SESSION_TTL_SECONDS` |
| Longitud de contraseña nueva | Entre 15 y 128 puntos de código Unicode | API y Android, sin mezcla obligatoria; acceso anterior conservado |

Los códigos se invalidan al usarse; verificación y recuperación tienen propósitos distintos. Un cambio de contraseña revoca las sesiones y códigos pendientes de esa cuenta. El acceso y la recuperación tienen además límites de solicitudes por IP. El alta pública solo crea cuentas de ciudadano; no hay endpoints de administración ni campos públicos para asignar permisos.

Sigue pendiente definir con el departamento la recuperación cuando el ciudadano pierde simultáneamente correo y contraseña. También siguen pendientes las reglas y datos institucionales de sedes, trámites y citas. No se fijaron horarios, cupos ni tolerancias.

## Docker para la siguiente etapa

`infra/compose.yaml` y `api/Dockerfile` preparan PostgreSQL, ejecución de migraciones y API en contenedores. La base no publica un puerto y la API se publica solo en la interfaz local del host para integrarla después con Nginx.

Desde la raíz del proyecto, cuando haya Docker disponible:

```powershell
docker compose --env-file api/.env -f infra/compose.yaml up --build -d
```

Las migraciones corren antes de iniciar la API. No se ha ejecutado esta configuración en el VPS ni cambiado Nginx, Cloudflare o el dominio. En esta computadora las comprobaciones usaron PostgreSQL nativo porque no se encontró Docker en la ubicación habitual; la configuración de contenedores requiere validación antes del despliegue.

## Comprobaciones de esta entrega

- Compilación Android debug y ejecución en un emulador local.
- Compilación TypeScript, validación de Prisma y aplicación de tres migraciones en PostgreSQL local, incluida la clave nullable de municipio.
- Catorce pruebas de API, cuatro de validación Android y doce en emulador: acceso anterior, verificación, códigos, contraseñas, catálogo, errores, enfoque y texto ampliado. Véanse [resultados y límites](acceso-y-registro.md#verificación).
- Respuestas HTTP reales: salud y conexión a base de datos correctas; perfil sin sesión rechazado; registro con campos de permisos no permitidos rechazado.
- Sin pruebas de entrega real de Resend ni registro completo con correo: requieren completar el remitente y la configuración del proveedor.

Referencias de implementación: [Android Gradle Plugin](https://developer.android.com/build/releases/agp-8-13-0-release-notes), [Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [API de envío de Resend](https://resend.com/docs/api-reference/emails/send-email), [restablecimiento de contraseña de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
