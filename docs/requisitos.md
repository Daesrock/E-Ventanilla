# Acuerdos y pendientes de requisitos

Este documento registra las decisiones de requisitos antes de iniciar la implementación. Fuente principal: 7J_AE2_Proyecto2.pdf; referencia visual: el archivo de Figma compartido. Las respuestas del usuario tienen prioridad sobre el documento original. No se considera acordada una propuesta por el mero hecho de estar escrita aquí.

El usuario también aportó una página oficial de COESA y dos presentaciones VUGE/VIM. La extracción y las diferencias entre fuentes se registran en [Información institucional](fuentes-institucionales.md). Son evidencia para los requisitos, sin cambiar por sí solas las decisiones de alcance de la aplicación.

El usuario aportó además Diagrama_Navegacion.pdf, de una página, como contexto. Su estructura y diferencias frente a los acuerdos se registran en [Navegación móvil](navegacion-movil.md). Los recorridos representados no aprueban automáticamente nuevos datos, políticas de citas ni requisitos de registro.

## Estados

- Base documental: comportamiento descrito en el PDF, sin nueva decisión en esta revisión.
- Pendiente: requiere una respuesta del usuario o del departamento.
- Propuesta técnica: recomendación para resolver el diseño; aún no es un acuerdo.
- Corrección documental: incoherencia identificada y resolución registrada en esta documentación de trabajo. El PDF original no se modifica.
- Acordado: respuesta expresa del usuario registrada con su alcance.

## Regla acordada: información corroborada

Los datos institucionales y las reglas de operación deben estar respaldados por fuentes y corroborados antes de utilizarlos como información vigente. No se inventarán horarios, bloques, cupos, tolerancias, anticipaciones, costos, requisitos, tiempos de resolución, contactos, ubicaciones, disponibilidad por sede ni políticas de citas. Tampoco se usarán valores de ejemplo o ficticios en prototipos, demostraciones o cargas iniciales.

La información faltante se mantiene pendiente de corroboración, sin valores predeterminados que impliquen una regla o un dato institucional. Un dato desconocido no significa cero, gratuito, sin límite, cerrado o no disponible. La documentación conserva los datos de las fuentes con su procedencia y sus dudas de vigencia; ese registro no autoriza su publicación como información actual.

La app debe indicar cuando falte información confirmada. La reserva y las demás funciones que necesiten reglas pendientes no se habilitarán hasta corroborarlas. Los textos, personas, citas y QR de muestra presentes en Figma no se trasladarán como datos a la aplicación.

## Bloque 1: acceso, registro y alcance móvil

| ID | Tema | Base y propuesta | Estado |
| --- | --- | --- | --- |
| R01 | Consulta sin cuenta | Consulta pública de sedes, trámites y requisitos. Se requiere sesión para gestionar citas y acceder a datos personales. Sustituye la precondición de sesión de CU-01. | Acordado |
| R02 | Datos del ciudadano | En el registro: nombre y apellidos, CURP, correo, contraseña y municipio obligatorios; teléfono y RFC opcionales. El usuario aceptó la propuesta de registro con CURP, sin elegir posponerla hasta la reserva. | Acordado |
| R03 | Alcance de la app | Primera versión: información y citas para trámites presenciales. No incluye recepción de documentos ni pagos dentro de la app. El costo del trámite es informativo. | Acordado |
| R04 | Acceso y recuperación | Verificación del correo obligatoria durante el registro. Resend y recuperación por código en la app elegidos por el usuario. Primera implementación: acceso con CURP o correo y contraseña; verificación y recuperación con códigos separados. Integración del proveedor escrita, configuración y entrega real por comprobar. Recuperación sin acceso al correo sigue pendiente con el departamento. | Acuerdos implementados en la base inicial; configuración y caso excepcional pendientes |

R01, R02 y R03 se resolvieron con las respuestas del usuario del 7 de octubre de 2026. Para R04 el usuario aclaró que espera ambas opciones de identificador y recuperación de acceso; las propuestas siguientes no se consideran aceptadas automáticamente.

### R04: propuesta de funcionamiento y tecnología

- Verificación acordada: se exige durante el registro. Tras capturar los datos, el registro queda pendiente de verificación del correo; únicamente se completa cuando la API comprueba esa confirmación. Mientras esté pendiente, se mantiene la consulta pública y no se habilitan el acceso ordinario a la cuenta ni la gestión de citas. No se pospone la verificación hasta la primera reserva.
- Decisión técnica de la primera interfaz: usar un código en la app también para verificar el correo durante el registro. Tiene propósito separado del código de recuperación. No se registra como una elección expresa del usuario de la modalidad, sino como implementación del requisito de verificación durante el registro.
- Acceso implementado: CURP o correo identifica la misma cuenta y se exige contraseña en ambos casos. Esta medida técnica evita tratar la CURP por sí sola como prueba de titularidad. No requiere convertirla en clave primaria.
- Contraseña olvidada: el ciudadano proporciona CURP o correo; la API envía la recuperación únicamente al correo verificado que ya esté asociado a la cuenta. No se acepta otra dirección como destino de recuperación sin comprobar antes la titularidad.
- Correo olvidado con contraseña conocida: puede acceder con CURP y contraseña. Se propone permitir revisar su correo desde el perfil autenticado y verificar una nueva dirección antes de sustituirlo.
- Pérdida de acceso al correo y sin contraseña: el envío automático no resuelve este caso. Queda pendiente definir con el departamento un procedimiento de comprobación de identidad y responsables; no se inventa un canal de soporte ni una política institucional.
- Implementación inicial: módulo NestJS, modelo y migraciones PostgreSQL, integración HTTP con Resend y cola de envío persistente. El `.env` existe, con campos de clave y remitente pendientes de completar. La entrega real de correo no se ha comprobado.
- Seguridad implementada: códigos aleatorios, resumen HMAC para validación, cifrado mientras esperan entrega, vencimiento, uso único y límites de intentos y solicitudes. La recuperación devuelve un mensaje uniforme sin revelar la cuenta ni el correo completo asociado a una CURP. Las contraseñas se almacenan mediante scrypt y se restablecen; no se recupera ni se envía la anterior. Los valores técnicos iniciales están en [Primer arranque](primer-arranque.md#alcance-y-decisiones-técnicas-iniciales).
- Modalidad acordada para Android: código temporal enviado al correo e introducido en la app para establecer una contraseña nueva. Su longitud inicial implementada es de 8 dígitos; vigencia, intentos y reemisión tienen configuración de servidor. Son decisiones técnicas iniciales de seguridad, no reglas de citas del departamento.

El usuario confirmó que tiene Cloudflare Email Routing: recibe y reenvía correo, pero esa configuración no habilita por sí sola el envío general a ciudadanos. Aceptó Resend para el envío desde NestJS, conservando Cloudflare para DNS y recepción. El remitente del dominio del usuario y la configuración del servicio siguen pendientes. Véanse [las opciones de envío y sus fuentes](stack-y-despliegue.md#envío-de-correos-de-recuperación).

### Mejoras aprobadas del acceso y registro

El 8 de octubre de 2026 se aprobó catálogo de municipios de Chiapas de INEGI, contraseñas nuevas de 15–128 puntos de código Unicode sin mezcla obligatoria, bloqueo local de contraseñas comunes y conservación de confirmación. Se añadieron errores por campo y verificación contextual después de credenciales correctas. Se mantienen acceso de cuentas existentes y teléfono/RFC opcionales. Véanse [implementación y procedencia](acceso-y-registro.md).

## Bloque 2: sedes, disponibilidad y reservas

| ID | Tema | Base y decisión necesaria | Estado |
| --- | --- | --- | --- |
| R05 | Oferta por sede | Las presentaciones aportan siete ubicaciones VUGE y servicios VUGE/VIM. Se conservan como referencia pendiente de vigencia y de disponibilidad por sede. Falta confirmar requisitos, costos, tiempos y responsable del catálogo. Propuesta de modelo: relación Sede–Trámite, sin suponer que todas las sedes ofrecen todo. | Parcialmente documentado; decisión y vigencia pendientes |
| R06 | Horarios y cupos | CupoHorario pertenece a Sede. Las presentaciones no fijan la duración del bloque ni capacidad. Definir si depende de sede/trámite/personal, días/horarios, cierres y excepciones. No hay números acordados. | Pendiente |
| R07 | Reglas de reserva | Definir anticipación mínima y horizonte del calendario, máximo de citas activas, duplicados, horarios simultáneos y si solo se agenda para el titular. CU-02 no resuelve esos límites. | Pendiente |
| R08 | Cancelar y reagendar | CU-02 libera cupos y permite reagendar dentro de la misma sede y trámite. Definir límite de antelación, número de cambios y tratamiento de cambios por parte de la institución. | Pendiente |

## Bloque 3: recepción, atención y avisos

| ID | Tema | Base y decisión necesaria | Estado |
| --- | --- | --- | --- |
| R09 | Llegada y ausencia | CU-03 valida sede, fecha y tolerancia. Definir cuánta anticipación se admite, tolerancia de retraso, momento de vencimiento y qué ocurre si no se presenta. | Pendiente |
| R10 | Atención extemporánea | CU-03 permite autorizar la llegada tardía si existe capacidad y guardar el motivo. Confirmar quién autoriza, qué capacidad utiliza y prioridad del turno. | Pendiente |
| R11 | Resultado y seguimiento | CU-04 separa cita ATENDIDA y resultado CONCLUIDO/PENDIENTE. Confirmar esos estados y cómo continúa el ciudadano cuando el trámite queda pendiente. | Pendiente |
| R12 | Notificaciones | El PDF y Figma contemplan confirmación, cambio/cancelación y llegada registrada. Definir avisos dentro de la app, push, correo, recordatorios y anticipación. | Pendiente |

## Bloque 4: datos y administración futura

| ID | Tema | Base y propuesta | Estado |
| --- | --- | --- | --- |
| R13 | Identificador del usuario | CU-09 habla de CURP como clave primaria; los modelos muestran UUID interno y CURP única. Primera implementación de cuentas: UUID como clave interna, CURP única obligatoria en registro según R02 y correo único normalizado. No se implementaron aún las relaciones administrativas de personal. | Decisión técnica inicial implementada |
| R14 | Permisos | Conservar Ciudadano, Personal de Ventanilla, Jefe de Ventanilla y Jefe de Departamento. Jefe de Ventanilla limitado a su sede; Jefe de Departamento con alcance consolidado. Representar permisos por rol y estado activo de usuario. Confirmar las acciones configurables y si un jefe puede administrar más de una sede. | Pendiente |
| R15 | Estados y relaciones históricas | Sede y Ventanilla activas/inactivas, historial de AsignacionPersonal y resultado separado de la cita. El modelo actual ya muestra activa en Sede y activo en Usuario, aunque algunas fichas dicen que faltan. Actualizar esas observaciones; no duplicar atributos. | Corrección documental |
| R16 | Reportes futuros | CU-07 define atenciones por ventanilla, demanda por trámite, espera entre llegada e inicio y afluencia. Confirmar si el departamento necesita además exportaciones o un formato mensual específico. El panel queda para la última etapa. | Pendiente |

## Correcciones documentales que no requieren inventar reglas

1. CU-05 es Asignar personal a ventanillas y CU-06 es Administrar ventanillas de sede. Las referencias de CU-03 a CU-05 como Validar QR y CU-06 como Atender extemporáneamente no corresponden a la numeración actual. En la documentación de trabajo se tratará la validación del pase como subproceso compartido de recepción y atención, y la llegada tardía como alternativa de recepción. No se asignará un nuevo número de caso sin actualizar el conjunto de fichas.
2. La precondición general de CU-02 no debe exigir citas existentes para crear la primera. Se requiere sesión para crear; una cita propia y en estado elegible para modificar o cancelar.
3. CU-08 y CU-09 mencionan atributos activos que supuestamente faltan. Los diagramas actuales ya incluyen Sede.activa y Usuario.activo; corregir la referencia al modelo anterior.

Estas correcciones se registran aquí; no se ha editado el PDF ni Figma.

## Restricciones técnicas del diseño previsto

- La API confirma las reservas y controla cupos, estados, titularidad y permisos. La interfaz por sí sola no determina que una cita quedó reservada.
- Las operaciones de reservar, cancelar y reagendar deben actualizar cita y cupos de forma consistente, incluyendo solicitudes simultáneas y reintentos.
- El QR identifica una cita para su validación por la API; su lectura por sí sola no cambia el estado de la cita.
- La consulta por municipio sigue disponible si no se permite GPS, como describe CU-01.
- El prototipo y la aplicación respetarán la regla de información corroborada: los faltantes permanecerán pendientes, sin datos institucionales ni operaciones ficticias.

## Acuerdos de esta revisión

### 7 de octubre de 2026 — Acceso, registro y alcance

- R01: el usuario eligió consulta pública y sesión para citas.
- R02: el usuario indicó «Me gusta la propuesta» a los datos del registro; se adopta la lista propuesta con CURP obligatoria en el registro y teléfono/RFC opcionales.
- R03: el usuario eligió información y citas para trámite presencial.

No se consideran resueltos los otros requisitos por estas respuestas. El siguiente bloque consulta oferta por sede, modelo de cupos y disponibilidad de horarios reales.

### 7 de octubre de 2026 — Fuentes institucionales

El usuario proporcionó la página VIM de COESA y las presentaciones VUGE y VIM para consultar información sobre sedes y servicios. R05 queda parcialmente documentado. El suministro de estas fuentes no se interpreta como elección de capacidad, duración de bloques u otra política de citas.

### 7 de octubre de 2026 — Prohibición de inventar datos

El usuario indicó que horarios, cupos, tolerancias y la información institucional u operativa de este tipo no se pueden inventar ni presentar como ejemplos o datos ficticios. Deben quedar pendientes hasta corroborarse. Se retira la propuesta anterior de usar datos y operaciones de demostración en la primera entrega móvil; también se elimina la propuesta de un QR de muestra.

### Revisión de R04 — Acceso y recuperación

El usuario espera poder acceder con CURP o correo y plantea recuperar correo o contraseña. Inicialmente indicó que podía enviar correos con su dominio mediante Cloudflare, sin recuperación implementada. En ese momento no se había elegido un proveedor adicional ni inspeccionado la configuración de su cuenta. El acceso con contraseña en ambas modalidades y los flujos anteriores se registraron como propuestas técnicas.

En su aclaración posterior, el usuario confirmó que el servicio configurado es Cloudflare Email Routing, para reenvío de correos recibidos. Se propuso entonces Resend para el envío saliente. Su aceptación posterior se registra a continuación; el servicio aún no se ha configurado.

### 7 de octubre de 2026 — Elección del proveedor de envío

El usuario aceptó la propuesta de Resend. Queda elegido como proveedor de envío de correo de la API. La cuenta, verificación del dominio, remitente y credenciales de servidor aún no están configurados. Se consulta la preferencia entre código y enlace de recuperación, y entre verificar el correo antes de la primera reserva o antes del primer acceso a la cuenta. El caso de pérdida simultánea de correo y contraseña permanece pendiente de definir con el departamento.

### 7 de octubre de 2026 — Modalidad de recuperación

El usuario eligió «Código dentro de la app». La recuperación de contraseña se realizará mediante un código enviado al correo e introducido en Android. En ese momento aún faltaba resolver cuándo exigir la verificación del correo; la respuesta posterior se registra a continuación. El procedimiento ante pérdida simultánea de correo y contraseña permanece pendiente.

### 7 de octubre de 2026 — Verificación durante el registro

El usuario indicó que la verificación del correo debe exigirse al realizar el registro. Se adopta como paso obligatorio para completarlo; no se difiere hasta la primera cita. Esta decisión define cuándo verificar, sin fijar valores de vigencia o intentos ni resolver el procedimiento institucional de recuperación sin acceso al correo.

### 7 de octubre de 2026 — Contexto de navegación

El usuario proporcionó Diagrama_Navegacion.pdf como documento adicional de contexto. Se registraron sus recorridos y las diferencias con R01, R02 y R04. No se añaden direcciones obligatorias, datos de muestra ni reglas de operación por su presencia en el dibujo; tampoco se considera resuelto R05–R12 por sus formularios o flechas.

### 7 de octubre de 2026 — Inicio de implementación

El usuario indicó que ya tiene la API key de Resend, pidió preparar un `.env` y empezar con lo primario. Se crearon la app Android, su navegación y formularios, la API de acceso, PostgreSQL para cuentas y códigos y la configuración Docker. Se adoptaron las decisiones técnicas de acceso con contraseña en ambas modalidades, UUID interno y código de verificación de correo dentro de la app. Estas decisiones no fijan políticas institucionales. El remitente y la entrega real de correo siguen pendientes; no se cargaron datos de muestra ni se habilitaron reservas.
