# Acceso y registro

Decisiones aprobadas el 8 de octubre de 2026. Se conserva la identidad de Figma y se usa verde `#0B6F63` en los botones y enlaces de autenticación (contraste con blanco: aproximadamente 6,06:1). Referencias: [acceso de USWDS](https://designsystem.digital.gov/templates/authentication-pages/sign-in/), [registro de USWDS](https://designsystem.digital.gov/templates/authentication-pages/create-account/), [contraseñas de GOV.UK](https://design-system.service.gov.uk/components/password-input/) y [contraste WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Son referencias de diseño, sin afirmar cumplimiento normativo mexicano.

## Formularios

Acceso muestra identificador, contraseña, recuperación, botón de inicio y enlace de registro en ese orden. La verificación de correo solo se ofrece después de comprobar credenciales correctas de una cuenta pendiente. Abre con el correo precargado; el reenvío es explícito. Los formularios conservan logotipos y regreso, sin acceso a notificaciones.

Registro agrupa datos personales, acceso y datos opcionales. Municipio usa búsqueda sin distinción de caja o acentos, sin selección inicial. Teléfono y RFC siguen siendo opcionales. Los teclados de nombre y apellidos solicitan mayúscula por palabra sin transformar lo escrito. CURP y RFC se convierten en mayúsculas; correo y contraseñas no usan autocapitalización ni autocorrección.

Registro y recuperación conservan confirmación de contraseña. Los requisitos aparecen antes de escribir y los errores al salir de un campo o intentar continuar. El primer error recibe enfoque. El envío solo se deshabilita durante una solicitud. Las contraseñas empiezan ocultas; los controles para mostrar contraseña y confirmación tienen etiquetas distintas. Se permite pegado y autocompletado. Los objetivos táctiles son de al menos 48 dp; el formulario se desplaza con texto ampliado y teclado abierto. Los bordes de entradas de autenticación usan gris `#71827F` para distinguirlos del fondo claro.

## Contraseñas

Las contraseñas nuevas requieren **15 a 128 puntos de código Unicode**, sin números o símbolos obligatorios. Se permiten espacios y frases; no se recortan, transforman, normalizan ni truncan. Android y API cuentan igual. La confirmación compara exactamente lo escrito. Se conservan scrypt y los hashes existentes; la política nueva no se aplica al inicio de sesión. Referencia: [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver).

Se compara la contraseña completa contra una copia local de la lista pública NCSC distribuida por SecLists. Solo esa comparación ignora mayúsculas; el hash conserva el texto original. No se consultan contraseñas en servicios externos. Fuente, commit, checksum, fecha y licencia MIT están en `api/resources/common-passwords.metadata.json` y `SecLists-LICENSE.txt`, con copias idénticas en los recursos de Android. Ambas aplicaciones verifican el checksum.

## Catálogo

Fuente: [Catálogo Único de INEGI](https://www.inegi.org.mx/app/ageeml/default.html), descarga oficial `catun_municipio.zip`, referencia **agosto de 2026**, publicación **15 de septiembre de 2026**, filtrada por entidad `07`. La instantánea contiene 124 claves únicas; esa cantidad proviene de la descarga y no es una regla del programa. Este catálogo geográfico no representa sedes operativas.

`api/resources/municipalities.json` y `android/app/src/main/assets/municipalities.json` son idénticos. Incluyen procedencia, fechas, miembro del ZIP y SHA-256 del archivo, CSV y arreglo de municipios. Se verifican integridad, claves y unicidad. El selector funciona sin conexión; el registro requiere API. Para actualizar, hay que corroborar nuevamente referencia y publicación en INEGI. `scripts/import-auth-resources.py` rechaza un ZIP diferente antes de reutilizar los metadatos anteriores.

## API y migración

- `GET /v1/catalog/municipalities`: devuelve `{ metadata, municipalities: [{ code, name }] }`. Público, sin sesión ni consulta a PostgreSQL.
- Registro: enviar `municipalityCode`; el servidor valida la clave y guarda el nombre oficial. Clientes anteriores pueden enviar `municipality` si coincide inequívocamente, ignorando caja y acentos. Si llegan ambos deben coincidir. No se aceptan claves o nombres ajenos al catálogo.
- Migración `202610080001_municipality_code`: añade `User.municipalityCode` nullable. Conserva los datos y hashes existentes; no exige una clave a cuentas anteriores para entrar.
- Validación: HTTP 400 con `message`, `code: VALIDATION_ERROR` y `fieldErrors`, sin valores recibidos.
- Credenciales correctas y correo pendiente: HTTP 403 con `message`, `code: EMAIL_VERIFICATION_REQUIRED` y `email`, sin token. Credenciales incorrectas: HTTP 401 genérico, sin información de la cuenta.
- Código incorrecto/vencido: error junto a `code`; contraseña rechazada: junto a `password`.

`scripts/start-api.ps1` aplica las migraciones pendientes al iniciar. Si la base ya funciona, puede usarse `pnpm db:migrate` dentro de `api`. Se conservan los secretos de `.env` y la URL configurada en `android/local.properties`.

## Verificación

`pnpm test` comprueba límites Unicode, frases y espacios, bloqueo de contraseñas comunes, copias idénticas, claves inválidas, acceso anterior, privacidad y contrato HTTP. Sus fixtures son aislados en memoria, sin altas de ciudadanos ni envío de correos.

`scripts/build-android.ps1 -Test` compila y ejecuta pruebas JVM. `connectedDebugAndroidTest` ejecuta pruebas Compose de enfoque, búsqueda y selección sin conexión, confirmación, verificación contextual y texto al doble de tamaño, y obtiene capturas de formularios vacíos.

Resultados del 8 de octubre de 2026: compilación TypeScript y Android debug correctas, **14 pruebas de API**, **4 pruebas JVM** y **12 pruebas en emulador Android 16**, sin fallos. La selección y búsqueda de municipios se comprobaron además con Wi-Fi y datos del emulador desactivados. Se aplicó la migración nullable en PostgreSQL local y se comprobaron salud, disponibilidad, catálogo público y errores de validación con la API completa. El proceso de comprobación tuvo el envío de correo desactivado; no se cambiaron las credenciales de `.env`.

La revisión manual con TalkBack, un gestor de autocompletado y teléfono físico sigue pendiente: no había un teléfono conectado. Las etiquetas y pruebas de semántica no sustituyen esa revisión. Docker no está disponible en esta computadora; el Dockerfile incluye los recursos nuevos, pero no se probó el contenedor ni se desplegó en el VPS. Citas, panel web y entrega real de Resend conservan sus etapas previstas.

Las capturas de los formularios vacíos se entregan en [Capturas de acceso](capturas/acceso/README.md).
