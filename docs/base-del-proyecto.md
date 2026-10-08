# Contexto y primera versión móvil

## Decisiones expresadas por el usuario

- La app se desarrollará para Android usando Android Studio.
- La prioridad es tener una aplicación móvil visible y utilizable cuanto antes.
- El panel web se desarrollará al final; TypeScript es una opción prevista para él.
- Stack acordado: Kotlin y Jetpack Compose para Android; TypeScript, Node.js y NestJS para la API; PostgreSQL con Prisma y migraciones.
- Resend elegido para el envío de correo de verificación y recuperación desde la API; configuración pendiente. Cloudflare conserva DNS y Email Routing para recepción y reenvío.
- VPS propio con Linux aarch64 (ARM64), dos núcleos, 12 GB de RAM y acceso completo. Se usará Docker para los servicios del proyecto.
- Dominio existente: daesrock.dev. Nginx y Cloudflare ya están configurados; el proyecto se integrará con ellos.
- Para preparar el despliegue faltan distribución y versión de Linux, almacenamiento disponible y ubicación/redes del Nginx existente (host o contenedor).
- El proyecto es académico, con contacto presencial con los licenciados del departamento destinatario y posible aplicación real.
- El borrador de Figma se conserva como punto de partida y puede mejorarse.
- Sedes, trámites y requisitos tendrán consulta pública; gestionar citas y datos personales requerirá sesión.
- Registro ciudadano: nombre y apellidos, CURP, correo, contraseña y municipio obligatorios; teléfono y RFC opcionales.
- La verificación del correo es obligatoria durante el registro; este queda pendiente hasta confirmar el correo. La recuperación de contraseña usa un código enviado por correo e introducido en la app.
- La primera versión brinda información y citas para atención presencial; el envío de documentos y los pagos dentro de la app quedan fuera de ese alcance.
- Los datos institucionales y las reglas operativas deben corroborarse. No se inventarán ni se reemplazarán con ejemplos o datos ficticios; los faltantes permanecerán pendientes incluso durante el prototipo.

## Usuarios y operación

Ciudadano: consultar sedes y trámites, gestionar citas y recibir avisos desde Android.

Personal de ventanilla: registrar llegada y atender citas. Jefe de ventanilla: administrar ventanillas, asignaciones e indicadores de su sede. Jefe de departamento: administrar sedes, personal, roles y permisos y consultar indicadores consolidados. Sus interfaces web se posponen.

Una cita atendida puede tener un trámite pendiente: el estado de la cita, la atención presencial y el resultado del trámite deben conservarse por separado.

## Estado del borrador de Figma revisado

Contiene las páginas PLANTILLA_APP, PANTALLA_TRAMITES, PANTALLA_DIRECTORIO, PANTALLA_CITAS y PANTALLA_NOTIFICACIONES. Incluye plantilla base y menú lateral abierto. En la revisión no se encontraron conexiones interactivas configuradas entre pantallas.

| Área | Punto de partida | Trabajo para la primera versión |
| --- | --- | --- |
| Navegación | Encabezado, buscador, barra lateral y menú | Adaptar a Android, conectar destinos y navegación de regreso |
| Trámites | Catálogo visual y referencia a sede cercana | Búsqueda y detalle con información corroborada; indicar los datos pendientes |
| Directorio | Mapa previsto y tarjetas de sedes | Lista navegable, detalle y selección manual de municipio |
| Citas | Activas, historial, QR, reagendar y cancelar | Diseñar reserva, confirmación, detalle y confirmaciones de cambios |
| Notificaciones | Pase QR y lista de avisos | Mostrar avisos reales cuando existan; estado vacío cuando no haya avisos |
| Acceso y perfil | Perfil figura como destino del menú | Diseñar acceso, registro con verificación obligatoria de correo, recuperación mediante código y perfil básico |

## Primera entrega: app navegable con información corroborada

El [diagrama de navegación móvil revisado](navegacion-movil.md) complementa Figma con selección y fichas de trámites/sedes, formularios de gestión de citas, acceso y perfil. Se registran allí las adaptaciones necesarias para consulta pública, verificación durante el registro y recuperación por código; no implica que las pantallas faltantes ya estén diseñadas.

### Preparación para iniciar

La revisión del entorno confirmó Android Studio y el SDK instalados. En la primera implementación se creó y compiló la app, y se ejecutó en un emulador aislado. La guía y el alcance actual están en [Primer arranque](primer-arranque.md).

Los acuerdos actuales permiten iniciar la estructura del proyecto, navegación y pantallas de consulta con estados de información pendiente. La primera entrega se centrará en Inicio, Trámites, Directorio, Citas, Notificaciones y Acceso/Perfil, siguiendo las referencias visuales y de navegación. Los formularios de registro, verificación y recuperación se prepararán conforme a R02 y R04; no se mostrarán mensajes de envío o éxito sin una operación real de la API.

Para activar el envío real en registro y recuperación falta configurar Resend, verificar el dominio y definir el remitente. La integración de correo ya está implementada en la API. Para activar reservas falta corroborar la oferta vigente por sede, horarios, capacidad y reglas de citas. El procedimiento de recuperación sin acceso al correo y la contraseña permanece pendiente con el departamento. Estos pendientes no se rellenarán con valores ficticios y no impiden preparar la base técnica.

El proyecto Android, la navegación y el módulo de acceso conectado a la API ya están implementados. Las cuentas y códigos tienen modelo y migraciones PostgreSQL, y el envío de correo tiene integración con Resend y cola persistente. Falta completar su configuración y comprobar el registro con correo real. La configuración del VPS y el panel web se mantienen para etapas posteriores; no se modificaron servicios externos.

Tras resolver los requisitos necesarios, crear el proyecto Android y la navegación Inicio → Directorio o Trámites → Detalle, además de acceso, perfil y las pantallas de citas. Mantener la identidad visual del borrador y mejorar legibilidad y espacio disponible.

Usar únicamente información corroborada y mostrar claramente lo pendiente de confirmar. No trasladar los datos de muestra de Figma ni crear personas, reservas, horarios, cupos o QR ficticios. El recorrido Agendar → Confirmación → Mis citas → Pase QR se habilitará cuando sus reglas estén corroboradas y las reservas puedan persistirse y validarse con la API.

Organizar el acceso a datos para conectar la API sin rehacer las pantallas. La navegación y los estados de información pendiente pueden revisarse en emulador o teléfono antes de publicar el servidor.

## Segunda entrega: app conectada

Implementar en la API el acceso de ciudadanos, sedes y trámites, consulta de disponibilidad, creación de citas, consulta de citas propias, cancelación y reagendamiento. Conectar Android a PostgreSQL a través de esa API y emitir pases QR asociados a citas reales.

Las cargas iniciales incluirán únicamente datos corroborados, conservando su procedencia. Los catálogos por sede y horarios sin confirmar permanecerán pendientes. Su administración visual llegará con el panel web.

## Pendientes de requisitos

El seguimiento detallado, las propuestas y las respuestas se registran en [Acuerdos y pendientes de requisitos](requisitos.md). La lista siguiente resume los temas originales y no indica que las propuestas ya estén aceptadas.

- Confirmar duración de bloques, capacidad, tolerancia y antelación para cambios.
- Definir qué trámites ofrece cada sede y sus horarios de atención.
- Revisar las relaciones restantes del modelo institucional; las cuentas ya usan UUID interno como clave primaria y CURP única como identificador de acceso.
- Corregir las referencias de CU-03 a CU-05 y CU-06 según la numeración vigente.
- Precisar los permisos configurables, la autenticación y recuperación de acceso.
- Confirmar canales de notificación y reglas de atención extemporánea.

Los textos de plantilla del PDF no son órdenes de implementación. Las reglas identificadas como propuestas en él necesitan validación antes de tratarse como definitivas.
