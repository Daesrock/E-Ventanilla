# API E-Ventanilla

Base NestJS/TypeScript con Prisma y PostgreSQL. Configuración privada: `.env`. Guía para abrir y ejecutar todo el proyecto: [Primer arranque](../docs/primer-arranque.md).

## Comandos

Desde esta carpeta, con Node.js 24 y pnpm:

```powershell
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

Para desarrollo usa `pnpm dev`; para recompilar TypeScript al editar, `pnpm build:watch` en otra terminal. `pnpm test` compila y ejecuta las pruebas sin crear ciudadanos ni enviar correos.

## Rutas iniciales

Todas usan el prefijo `/v1`. Los cuerpos son JSON.

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/health` | Estado del proceso |
| GET | `/ready` | Conexión a PostgreSQL |
| GET | `/catalog/status` | Estado pendiente de información institucional |
| GET | `/catalog/municipalities` | Municipios de Chiapas y procedencia INEGI |
| POST | `/auth/register` | Alta pendiente y solicitud de código de verificación |
| POST | `/auth/verify-email` | Verificar correo y completar registro |
| POST | `/auth/resend-verification` | Solicitar reemisión de verificación |
| POST | `/auth/login` | Acceso con CURP o correo y contraseña |
| POST | `/auth/forgot-password` | Solicitar recuperación al correo registrado |
| POST | `/auth/reset-password` | Validar código y actualizar contraseña |
| GET | `/auth/me` | Perfil autenticado |
| POST | `/auth/logout` | Revocar sesión actual |

`register` recibe `firstName`, `lastName`, `curp`, `email`, `password`, `municipalityCode`; `phone` y `rfc` son opcionales. Los clientes anteriores pueden enviar `municipality` si coincide inequívocamente con un nombre del catálogo. `login` recibe `identifier` y `password`. Las solicitudes de código reciben `identifier`. `verify-email` recibe `email` y `code`; `reset-password` recibe `identifier`, `code` y `password` nueva. Las rutas de perfil y salida requieren `Authorization: Bearer` con el token devuelto al iniciar sesión.

Contraseñas nuevas: 15–128 puntos de código Unicode, sin mezcla obligatoria y con bloqueo local de contraseñas comunes. El acceso conserva las contraseñas anteriores. Errores 400 incluyen `message`, `code: VALIDATION_ERROR` y `fieldErrors`. Credenciales correctas con correo pendiente devuelven 403 con `code: EMAIL_VERIFICATION_REQUIRED` y `email`, sin sesión. Véanse [decisiones, procedencia y pruebas](../docs/acceso-y-registro.md).

No hay registros de muestra, endpoints para reservar citas ni asignación pública de roles. La cola de correo evita exponer tiempos de entrega en el restablecimiento; su configuración real debe completarse antes de probar cuentas con correo.
