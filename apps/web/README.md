# E-Ventanilla · panel institucional

Panel web de una sola dependencia: Departamento de Gestión Empresarial y Ventanillas Integrales de la Comisión Estatal de Simplificación Administrativa. Tiene acceso institucional conectado a API y un modo demostración independiente. Diseño propio y recursos institucionales entregados.

## Ejecutar localmente

Requisitos: **Node.js 22.12+ o 24+**, npm y acceso a Internet para instalar paquetes. Desarrollo verificado con Node 24.15.0. La web vive en `apps/web`; la API usa Bun 1.4.2. La entrega de web/API se documenta en `contracts/entrega-web-api-2026-10-16.md`, desde la raíz del repo.

Desde esta carpeta:

```sh
npm ci
npm run dev
```

Abrir **http://127.0.0.1:5173/acceso**. El comando inicia Vite y BFF local (`127.0.0.1:3001`). El acceso es institucional: correo o CURP y contraseña; el rol lo determina la cuenta. Las cuentas de prueba local se preparan con `scripts/prepare-web-local.mjs`; sus credenciales quedan en `.tools/web-local-access.json` y no se versionan.

El logo oficial de E-Ventanilla (`public/assets/logos/eventanilla.png`) se incluye en el árbol del proyecto y no requiere preparación adicional. Reemplazó al recurso anterior de la dependencia; el favicon es un recorte cuadrado del mismo logo (`public/assets/logos/favicon.png`).

### Configuración opcional

Crear `.env` privado a partir de `.env.example` si necesitas cambiar configuración. Los valores por defecto ya apuntan a la API documentada y al origen local anterior. `APP_ORIGIN` debe coincidir exactamente con el origen del navegador; usar `localhost` en vez de `127.0.0.1` requiere ajustar esa variable.

| Variable privada | Valor por defecto                         | Propósito                                              |
| ---------------- | ----------------------------------------- | ------------------------------------------------------ |
| `API_BASE_URL`   | `https://api-ventanilla.daesrock.dev/v1/` | Destino HTTPS del BFF                                  |
| `PORT`           | `3001`                                    | Puerto del BFF                                         |
| `APP_ORIGIN`     | `http://127.0.0.1:5173`                   | Origen permitido en solicitudes de escritura de sesión |
| `NODE_ENV`       | desarrollo                                | `production` sirve `dist` y usa cookies Secure         |

No colocar tokens, contraseñas o `DATABASE_URL` en variables públicas ni archivos versionados. Para API local usar `API_BASE_URL=http://127.0.0.1:3000/v1/`; HTTP solo se acepta en loopback durante desarrollo. Producción exige HTTPS.

## Modo institucional

- Sedes: formulario por secciones con selector de ubicación en mapa (OpenStreetMap).
  La latitud y longitud se guardan en la API y la app móvil las usa para mostrar la sede.
- Oferta con búsqueda, filtros, revisión de altas/retiros, descarte y persistencia en BD.
- Catálogo central: costo decimal o pendiente (null), publicación con fuente corroborada.
- Personal: root crea las cuentas; el jefe de departamento asigna responsables
  desde cada sede.
- Citas y reportes con paginación de API; exportación CSV del conjunto completo filtrado.
- Acciones y navegación según permisos/alcance de `/v1/admin/me`.
- Atención registra tiempos; no inventa transiciones de estado de cita.
- Root crea cuentas/sedes; departamento configura y asigna responsables.

El BFF conserva el token en servidor y usa cookie HttpOnly con alcance `/bff`.
La identidad administrativa se recupera al recargar. Reiniciar el BFF requiere nuevo login.
En modo real los módulos no rellenan datos con la demostración.

## Demostración conservada para pruebas

El acceso institucional es la única entrada del panel; la demostración ya no se
ofrece desde la pantalla de acceso. El modo ficticio permanece en el código para
las pruebas automatizadas y sesiones existentes (`eventanilla.demo.data.v1` en
localStorage; el perfil en sessionStorage). No se guardan tokens reales en esos almacenes.

**Interfaz simplificada:** Sedes se organiza en Información, Trámites y Horarios. Formularios agrupan datos, señalan obligatorios y muestran errores junto al campo. El menú usa nombres breves; Configuración concentra opciones técnicas. El distintivo Demostración de navbar explica el entorno sin avisos repetidos.

## Comandos de calidad

```sh
npm run typecheck
npm run lint
npm run format:check
npm run docs:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de lógica y del BFF utilizan datos ficticios y un upstream simulado. Las pruebas de navegador sustituyen consultas externas; no registran ciudadanos ni modifican el VPS.

Para comprobar conectividad real, `npm run check:api` consulta únicamente GET públicos de health, ready y catálogos mediante un BFF efímero. No inicia sesión ni ejecuta escrituras. Requiere acceso a Internet y disponibilidad de API.

`npm run preview` permite revisar compilación con el BFF en ejecución. Para servir el build con un solo proceso detrás de un proxy HTTPS, configurar `NODE_ENV=production`, `APP_ORIGIN=https://dominio-aprobado`, ejecutar `npm run build` y `npm start`. BFF escucha en loopback: requiere proxy del host o adaptación de red del entorno de despliegue. No se incluye despliegue Docker/VPS en esta entrega.

## Organización y documentación

- [Contexto único](docs/project-context.md): objetivo, decisiones, cambios de BD aplicados y plan de integración con API.
- [Arquitectura](docs/architecture.md): módulos, layouts, almacén y límites de integración.
- [Rutas y perfiles](docs/routes-and-roles.md): alcance de cada vista y operación.
- [Sistema visual](docs/design-system.md): paleta, patrón, logo y componentes.
- [Contrato API](docs/api-integration.md): endpoints disponibles, sesiones y reportes.
- [Mapa de archivos](docs/file-map.md): propósito de cada archivo, incluidos configuraciones y recursos.

Los archivos fuente incluyen encabezado de responsabilidad. Funciones con reglas importantes incluyen documentación de su contrato. JSON, binarios y archivos generados se documentan en el mapa para preservar formatos válidos.

`npm run format` aplica formato a fuentes y documentos. `npm run docs:check` comprueba que cada archivo propio esté inventariado y cada archivo de código tenga encabezado. Las cuentas ficticias creadas por root se pueden elegir después desde acceso al seleccionar su rol.
