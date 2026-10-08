# E-Ventanilla

Las mejoras de autenticación, las contraseñas y la procedencia del catálogo de municipios están en [Acceso y registro](docs/acceso-y-registro.md).

Proyecto académico con interlocución directa con el departamento destinatario. Busca facilitar la consulta de sedes y trámites empresariales en Chiapas, organizar citas presenciales y registrar su atención.

## Prioridad actual

Desarrollar primero la aplicación Android, tomando el borrador de Figma como base visual. El panel web queda para la última etapa. La API y PostgreSQL se desarrollarán para dar soporte a la app y posteriormente al panel.

## Primera base disponible

Ya existen el proyecto Android, la API NestJS, el modelo inicial de cuentas en PostgreSQL y la configuración Docker. Android tiene navegación y formularios de registro, verificación, acceso y recuperación. La API está preparada para enviar los códigos mediante Resend.

Abre `android/` en Android Studio. Completa `RESEND_API_KEY` y `RESEND_FROM` en `api/.env` para preparar el envío desde tu dominio verificado. La clave permanece en el servidor y Git ignora ese archivo.

Las reservas y los catálogos institucionales siguen pendientes de información corroborada. Se generó un APK debug y se comprobó su ejecución en un emulador; la API compiló y pasó ocho pruebas de acceso. El envío real de correo y el despliegue del VPS todavía no se han comprobado.

- [Guía para abrir y ejecutar el proyecto](docs/primer-arranque.md)
- [API y rutas iniciales](api/README.md)
- [Configuración privada local](api/.env)

## Documentación de trabajo

- [Contexto y primera versión móvil](docs/base-del-proyecto.md)
- [Diagrama de navegación móvil y ajustes a los acuerdos](docs/navegacion-movil.md)
- [Acuerdos y pendientes de requisitos](docs/requisitos.md)
- [Información institucional y directorio de referencia](docs/fuentes-institucionales.md)
- [Tecnologías acordadas y despliegue previsto](docs/stack-y-despliegue.md)

Estos documentos distinguen decisiones del usuario, decisiones técnicas y reglas pendientes de confirmar. La primera implementación funciona en desarrollo local; no hay despliegue público del proyecto.

## Información pendiente de corroboración

Por decisión del usuario, los datos institucionales y las reglas operativas no se inventarán ni se sustituirán por ejemplos o datos ficticios, tampoco en prototipos o demostraciones. Cada dato necesita respaldo y vigencia corroborada. Lo desconocido queda pendiente; las funciones que dependan de esa información se habilitarán cuando esté confirmada.

## Referencias

- [Figma: E-Ventanilla — Plantilla de Navegación](https://www.figma.com/design/Z0GxrbXj3gZEbtk9Oiqb7o)
- [Diagrama de navegación móvil](C:/Users/Pardo/Downloads/Diagrama_Navegacion.pdf), una página. Referencia de recorridos, complementaria a los acuerdos de requisitos.
