# E-Ventanilla · panel institucional

Prototipo web de una sola dependencia: Departamento de Gestión Empresarial y Ventanillas Integrales de la Comisión Estatal de Simplificación Administrativa. Diseño propio, colores institucionales, logotipo oficial entregado y patrón geométrico independiente.

## Ejecutar localmente

Requisitos: **Node.js 22.12+ o 24+**, npm y acceso a Internet para instalar paquetes. Desarrollo verificado con Node 24.15.0. La web es un proyecto autónomo en `apps/web`; no cambia versiones, código ni despliegue de la API existente. El objetivo, las decisiones y el plan de integración viven en [docs/project-context.md](docs/project-context.md).

Desde esta carpeta:

```sh
npm ci
npm run assets
npm run dev
```

Abrir **http://127.0.0.1:5173**. El comando inicia Vite y BFF local (`127.0.0.1:3001`). Elegir perfil de demostración: jefe de departamento, jefe de ventanilla o root.

`npm run assets` regenera la variante de presentación recortada a partir de `public/assets/logos/dependencia-original.png` (copia intacta del logo entregado). Si colocas de nuevo `coesmerBACKGROUND.png` en la raíz del repositorio, el comando actualiza primero esa copia. No se modifican colores ni contenido del logo.

### Configuración opcional

Crear `.env` privado a partir de `.env.example` si necesitas cambiar configuración. Los valores por defecto ya apuntan a la API documentada y al origen local anterior. `APP_ORIGIN` debe coincidir exactamente con el origen del navegador; usar `localhost` en vez de `127.0.0.1` requiere ajustar esa variable.

| Variable privada | Valor por defecto                         | Propósito                                              |
| ---------------- | ----------------------------------------- | ------------------------------------------------------ |
| `API_BASE_URL`   | `https://api-ventanilla.daesrock.dev/v1/` | Destino HTTPS del BFF                                  |
| `PORT`           | `3001`                                    | Puerto del BFF                                         |
| `APP_ORIGIN`     | `http://127.0.0.1:5173`                   | Origen permitido en solicitudes de escritura de sesión |
| `NODE_ENV`       | desarrollo                                | `production` sirve `dist` y usa cookies Secure         |

No colocar tokens, contraseñas o `DATABASE_URL` en variables públicas ni archivos versionados.

## Funciones del prototipo

- Inicio con tres indicadores mensuales y accesos por tarea.
- Directorio de sedes VUGE/VIM con municipio y responsable.
- Configuración de trámites por sede conservando asociaciones históricas.
- Catálogo central con costos iguales para todas las sedes.
- Horarios, capacidad y validación de superposiciones.
- Citas con filtros, paginación y simulación explícita de atención/inasistencia/cancelación.
- Reportes con periodo/sede, filtros desplegables, columnas elegibles, CSV y estadísticas/gráfico bajo demanda.
- Alta ficticia de jefes por root y asignación desde la sede.
- Diagnósticos GET reales, municipios públicos y prueba opcional de login/me/logout de API.

Los datos administrativos son **ficticios**, no un catálogo oficial. Guardado local usa `eventanilla.demo.data.v1` en localStorage; el perfil de demo usa sessionStorage. No se guardan tokens reales en esos almacenes. El acceso incluye botón para restablecer todos los datos de ejemplo.

Una sesión real se prueba en **Conexión con API** y **no habilita permisos administrativos**. El token queda en memoria del BFF; el navegador recibe un ID web independiente en cookie HttpOnly. Una cuenta real no se convierte en root ni jefe por elegir un perfil demo.

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
