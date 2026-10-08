# Contexto de navegación móvil

Revisión del 7 de octubre de 2026. Fuente: [Diagrama_Navegacion.pdf](C:/Users/Pardo/Downloads/Diagrama_Navegacion.pdf), una página, revisada como texto y como imagen. Complementa el PDF del proyecto y el borrador de Figma. El archivo original no se ha modificado.

Este documento distingue lo que representa el diagrama de las decisiones acordadas y las propuestas de adaptación. Recibir el archivo como contexto no aprueba automáticamente nuevos campos, reglas ni datos institucionales. Los acuerdos del usuario recogidos en [requisitos](requisitos.md) tienen prioridad.

## Estructura representada en el documento

Desde Inicio salen cinco opciones: Trámites, Directorio, Citas, Notificaciones y Mi perfil.

| Referencia del diagrama | Pantalla o ventana | Contenido y recorrido representados |
| --- | --- | --- |
| Inicio | Opciones principales | Entrada a los cinco módulos |
| 1.1 | Catálogo de trámites | Buscar por nombre o filtrar por categoría |
| 1.2 | Selección de trámite | Búsqueda o selección en lista; botón «Captura» |
| 1.3 | Ficha técnica del trámite | Requisitos, costos y tiempos; botón para agendar enlazado a 3.2 |
| 2.1 | Directorio de sedes | Mapa y lista de sedes |
| 2.2 | Selección de sede | Municipio o sede específica; botón «Captura» |
| 2.3 | Información de sede | Ubicación y horarios; botón para agendar en esa sede enlazado a 3.2 |
| 3.1 | Módulo de citas | Agendar una nueva cita o consultar citas |
| 3.2 | Formularios de gestión de citas | Agrupa las alternativas 3.2A, 3.2B y 3.2C |
| 3.2A | Agendar | Sede, trámite y fecha; acción de agendar |
| 3.2B | Reagendar | Seleccionar una cita y un nuevo horario |
| 3.2C | Cancelar | Seleccionar una cita y cancelarla |
| 3.3 | Comprobante transaccional | Pase digital con QR y folio único; muestra la etiqueta AGENDADA |
| 4.1 | Centro de notificaciones | Ver alertas y filtrar por fecha |
| 4.2 | Lectura de notificación detallada | Contenido del mensaje |
| 4.3 | Acción desde notificación | Acceso al pase digital, enlazado a 3.3 |
| 5.1 | Acceso/cuenta | Iniciar sesión o registrar ciudadano |
| 5.2 | Formulario de autenticación | CURP/contraseña y validación; el diagrama conduce aquí desde ambas opciones de 5.1 |
| 5.3 | Perfil de usuario activo | Datos del ciudadano e historial; nombre, apellidos, dirección, correo, teléfono y CURP |

Las referencias numeradas pertenecen a este diagrama; no sustituyen la numeración de casos de uso del PDF del proyecto. La palabra «ventana» tampoco fija si cada destino será una pantalla, un diálogo u otro componente de Android.

## Relación con el borrador de Figma

Los módulos coinciden con los destinos generales del borrador. Este PDF aporta el recorrido entre selección y detalle de trámites/sedes, las alternativas de gestión de citas y el salto desde una notificación al pase. También explicita acceso y perfil, que en la revisión de Figma no tenían pantallas completas propias.

El diagrama permite orientar el diseño de las pantallas que faltan en Figma; no demuestra que ya estén diseñadas o implementadas. Ninguna flecha de este archivo crea una conexión interactiva en Figma.

## Adaptaciones necesarias por acuerdos existentes

1. Consulta pública: catálogo, requisitos y directorio se mantienen accesibles sin cuenta según R01. Antes de gestionar citas se exige sesión. El diagrama no representa ese control; debe incorporarse al recorrido.
2. Acceso: el usuario espera poder identificar su cuenta con CURP o correo. El formulario 5.2 solo representa CURP/contraseña. La primera implementación contempla ambos identificadores y contraseña, como decisión técnica registrada en R04.
3. Registro: el alta necesita su formulario propio y verificación obligatoria del correo durante el registro. El paso directo de «Registro de Ciudadano» al formulario de autenticación no representa todo ese proceso. Los datos requeridos son los acordados en R02.
4. Recuperación: añadir solicitud, introducción del código recibido por correo y establecimiento de una contraseña nueva. Resend y el uso del código dentro de la app para recuperar la contraseña ya están acordados. El diagrama no incluye este recorrido.
5. Datos del perfil: «Dirección» aparece en 5.3, pero no es un nuevo dato obligatorio aprobado. El municipio sí está acordado y el teléfono es opcional; RFC opcional tampoco aparece en el diagrama. Esta fuente no cambia R02.
6. Información real: fechas, horas, identidad y QR ilustrativos del documento no se trasladarán a la app. Requisitos, costos, tiempos, horarios y ubicaciones solo se utilizarán cuando estén corroborados. Los faltantes seguirán pendientes.

## Observaciones y propuestas que no fijan reglas institucionales

- En 3.2A aparece fecha, pero no una selección explícita de horario disponible. La forma de obtener y presentar esa disponibilidad debe definirse cuando se corrobore la agenda; el diagrama no establece bloques, cupos ni límites.
- La salida de todo 3.2 conduce a 3.3, donde se representa un pase AGENDADA. Se propone distinguir el resultado de cada operación: una reserva confirmada permite consultar su pase, un reagendamiento refleja la cita actualizada y una cancelación muestra el resultado de cancelación. Cancelar no debe producir una nueva reserva ni un pase que implique que sigue agendada. La gestión de vigencia del QR sigue por definir.
- Se propone conservar el trámite o la sede elegidos al entrar a agendar desde 1.3 o 2.3. Antes de reservar, la API debe comprobar la oferta por sede y disponibilidad reales; una selección en la interfaz no prueba que el servicio se ofrezca allí.
- Los botones «Captura» de 1.2 y 2.2 necesitan precisar su significado en la interfaz; no se interpretan como obligación de pedir datos personales para consultas públicas.
- Faltan recorridos de regreso, estados sin resultados, solicitudes fallidas y el tratamiento de una sesión vencida. Son aspectos por diseñar, sin inventar datos para representarlos.
- El centro de notificaciones y su filtro por fecha son elementos documentados. Los canales de envío, recordatorios y reglas de avisos permanecen pendientes en R12. Los mensajes personales y pases deben respetar titularidad y permisos.

## Pendientes que este documento no resuelve

Vigencia y oferta del catálogo por sede; calendario, horarios, cupos, tolerancias y límites de cambios; verificación de identidad cuando se pierde acceso al correo y la contraseña; parámetros técnicos de los códigos; detalle de permisos y canales de notificación. Las reglas institucionales desconocidas se conservan pendientes de corroboración, sin valores ficticios.

La revisión del diagrama no modificó el PDF o Figma. Posteriormente, el usuario pidió iniciar el proyecto y se creó la primera base móvil; su alcance y comprobaciones están en [Primer arranque](primer-arranque.md).
