# Formularios vacíos

Capturas del APK de desarrollo en el emulador Android 16, 8 de octubre de 2026. No contienen ciudadanos, datos de registro ni operaciones de muestra.

| Pantalla | Captura |
| --- | --- |
| Iniciar sesión | [Formulario](01-iniciar-sesion.png) |
| Crear cuenta: datos personales | [Formulario](02-registro-datos.png) |
| Crear cuenta: acceso | [Formulario](03-registro-acceso.png) |
| Crear cuenta: datos opcionales | [Formulario](04-registro-opcionales.png) |
| Verificación de correo | [Formulario](05-verificacion.png) |
| Solicitar recuperación | [Formulario](06-recuperacion.png) |
| Establecer contraseña | [Formulario](07-nueva-contrasena.png) |

Se generan mediante `EmptyAuthCapturesTest`, renderizando las pantallas reales de navegación y autenticación. El capturador comprueba que la ventana activa sea la app y espera la presentación del último desplazamiento. No registra cuentas ni solicita correo.

Para conservar las imágenes tras las pruebas, ejecutar esa clase mediante el runner de instrumentación y copiar la carpeta `auth-captures` del directorio externo de archivos de la app antes de desinstalarla. Gradle limpia la instalación al terminar sus pruebas conectadas.
