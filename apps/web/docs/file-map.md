# Mapa de archivos

Inventario de responsabilidad de cada archivo de la aplicación. Los fuentes contienen además encabezado propio; JSON y binarios se documentan aquí para mantener su formato. `npm run docs:check` verifica cobertura y encabezados. Actualizar al agregar, mover o eliminar un archivo.

## Configuración y ejecución

| Archivo                | Responsabilidad                                                                   |
| ---------------------- | --------------------------------------------------------------------------------- |
| `package.json`         | Dependencias de web/BFF y comandos de desarrollo, calidad y documentación         |
| `package-lock.json`    | Resolución reproducible generada por npm; actualizar mediante npm, no manualmente |
| `index.html`           | Documento español, metadatos, favicon y montaje React                             |
| `tsconfig.app.json`    | Tipado estricto del código de navegador                                           |
| `tsconfig.node.json`   | Tipado del BFF, configuración y pruebas                                           |
| `vite.config.ts`       | Plugins React/Tailwind, puertos, proxy /bff y configuración Vitest                |
| `eslint.config.js`     | Reglas TypeScript/React, hooks y exclusión de generados                           |
| `.prettierrc.json`     | Formato consistente: comillas simples, ancho 100 y trailing commas                |
| `.prettierignore`      | Exclusión de dependencias, generados y lockfile                                   |
| `.env.example`         | Nombres y ejemplos de configuración privada, sin credenciales                     |
| `playwright.config.ts` | Navegador Chromium, servidor local y artefactos de pruebas                        |
| `README.md`            | Instalación, comandos, alcance funcional, datos ficticios y enlaces documentales  |

En raíz del proyecto: `../../.gitignore` excluye dependencias, secretos y artefactos. El logo oficial entregado se conserva en `public/assets/logos/eventanilla.png`; los insumos de contexto recibidos están resumidos en `docs/project-context.md`.

## App y layouts

| Archivo                              | Responsabilidad                                                           |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `src/main.tsx`                       | Montaje React, proveedores, estilos, router y captura de errores          |
| `src/app/config/brand.ts`            | Nombre institucional, departamento y rutas de recursos                    |
| `src/app/config/navigation.ts`       | Menú único, iconos y títulos de rutas                                     |
| `src/app/router/router.tsx`          | Rutas anidadas y redirecciones                                            |
| `src/app/providers/demo-context.ts`  | Contrato de almacén y hook de acceso                                      |
| `src/app/providers/DemoProvider.tsx` | Estado local, persistencia ficticia, perfil, comandos y restablecimiento  |
| `src/layouts/AuthLayout.tsx`         | Composición de acceso y panel decorativo                                  |
| `src/layouts/DashboardLayout.tsx`    | Shell compartido, control de entrada demo, sidebar/navbar/footer y Outlet |

## Componentes compartidos

| Archivo                                         | Responsabilidad                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `src/components/branding/InstitutionalLogo.tsx` | Presentación accesible del logo oficial                                 |
| `src/components/branding/ProductMark.tsx`       | Identidad del producto, separada del emblema institucional              |
| `src/components/navigation/Sidebar.tsx`         | Navegación, perfil e identidad en escritorio/móvil                      |
| `src/components/navigation/Navbar.tsx`          | Título, distintivo de demostración y cierre de demo/sesión API opcional |
| `src/components/navigation/Footer.tsx`          | Pie breve y enlace a Configuración                                      |
| `src/components/ui/Button.tsx`                  | Botón, variantes, iconos y props nativas                                |
| `src/components/ui/Badge.tsx`                   | Etiquetas de estado con significado textual                             |
| `src/components/ui/Field.tsx`                   | Campos con labels, obligatoriedad y errores asociados                   |
| `src/components/ui/FormSection.tsx`             | Agrupación semántica de campos por tarea                                |
| `src/components/ui/Disclosure.tsx`              | Controles secundarios desplegables mediante details/summary             |
| `src/components/ui/Modal.tsx`                   | Diálogo con captura/restauración de foco y Escape                       |
| `src/components/ui/PageHeader.tsx`              | Encabezado de módulo y acciones                                         |
| `src/components/ui/StatCard.tsx`                | Métrica y referencia explicativa                                        |
| `src/components/feedback/EmptyState.tsx`        | Ausencia de datos/resultados y acción opcional                          |
| `src/components/feedback/ToastProvider.tsx`     | Notificaciones temporales accesibles                                    |
| `src/components/feedback/ErrorBoundary.tsx`     | Recuperación de errores inesperados de render                           |

## Módulos

| Archivo                                                      | Responsabilidad                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `src/features/auth/policy.ts`                                | Reglas y alcance de perfiles exclusivamente demostrativos              |
| `src/features/auth/auth.service.ts`                          | Contratos login/me/logout de BFF real, sin token en frontend           |
| `src/features/auth/pages/LoginPage.tsx`                      | Selección de perfiles ficticios y restablecimiento                     |
| `src/features/dashboard/components/ActivityChart.tsx`        | Gráfico accesible de citas diarias                                     |
| `src/features/dashboard/pages/DashboardPage.tsx`             | Tres indicadores mensuales y accesos por tarea                         |
| `src/features/branches/components/BranchCard.tsx`            | Sede, municipio, responsable y acceso Administrar                      |
| `src/features/branches/components/BranchForm.tsx`            | Alta/configuración y edición local limitada por perfil                 |
| `src/features/branches/components/BranchOffer.tsx`           | Configurar asociaciones y preview ciudadano local                      |
| `src/features/branches/pages/BranchesPage.tsx`               | Directorio, filtros y alta de sede por root                            |
| `src/features/branches/pages/BranchDetailPage.tsx`           | Secciones de información, trámites y horarios validadas por alcance    |
| `src/features/procedures/components/ProcedureForm.tsx`       | Catálogo central, costo y requisitos uniformes                         |
| `src/features/procedures/pages/ProceduresPage.tsx`           | Consulta filtrable, detalle y edición del catálogo                     |
| `src/features/availability/components/SlotForm.tsx`          | Edición de bloques y capacidad con validación                          |
| `src/features/availability/pages/AvailabilityPage.tsx`       | Horarios por sede/fecha; reutilizable dentro de detalle de sede        |
| `src/features/appointments/appointment.config.ts`            | Etiquetas y tonos de estados ficticios                                 |
| `src/features/appointments/components/AppointmentDetail.tsx` | Datos de cita y acciones explícitamente simuladas                      |
| `src/features/appointments/pages/AppointmentsPage.tsx`       | Filtros, estados, paginación y detalle                                 |
| `src/features/reports/report.service.ts`                     | Filtros por alcance/cohorte y métricas con tiempos completos           |
| `src/features/reports/report.columns.ts`                     | Contrato único de columnas para tabla y exportación                    |
| `src/features/reports/pages/ReportsPage.tsx`                 | Consulta explícita, indicadores, columnas y CSV                        |
| `src/features/users/components/UserForm.tsx`                 | Alta ficticia de jefes, sin contraseñas ni registro ciudadano          |
| `src/features/users/pages/UsersPage.tsx`                     | Cuentas por perfil y enlaces para asignar responsables                 |
| `src/features/integration/pages/IntegrationPage.tsx`         | GET reales y prueba opcional de sesión sin autorización administrativa |
| `src/features/system/NotFoundPage.tsx`                       | Ruta inexistente y retorno al resumen                                  |
| `src/features/system/SettingsPage.tsx`                       | Integración técnica y restablecimiento de datos locales                |

## Datos y servicios transversales

| Archivo                          | Responsabilidad                                                        |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src/types/domain.ts`            | Contratos locales del prototipo; no son DTO oficiales                  |
| `src/mocks/seed.ts`              | Datos ficticios del mes de referencia y asociaciones coherentes        |
| `src/mocks/commands.ts`          | Operaciones locales inmutables con validación de alcance y referencias |
| `src/hooks/useScopedData.ts`     | Selección de sedes, citas y bloques del perfil                         |
| `src/hooks/useMunicipalities.ts` | Catálogo público real y respaldo ficticio identificado                 |
| `src/hooks/useToast.ts`          | Contrato y hook de notificaciones                                      |
| `src/services/api/client.ts`     | Fetch de mismo origen, timeout y manejo de errores                     |
| `src/utils/format.ts`            | Fechas de Chiapas, MXN, iniciales y exportación CSV segura             |
| `src/styles/global.css`          | Tokens Tailwind, componentes, patrón, layouts y responsive             |

## Backend intermediario

| Archivo                   | Responsabilidad                                                                 |
| ------------------------- | ------------------------------------------------------------------------------- |
| `server/config.ts`        | Validación de variables privadas y origen permitido                             |
| `server/session-store.ts` | Sesiones API en memoria con identificador web independiente y expiración        |
| `server/app.ts`           | Lista de endpoints, origen/CSRF, consultas públicas, autenticación y revocación |
| `server/index.ts`         | Carga privada de entorno, arranque y estáticos/rutas del build                  |

## Recursos y herramientas

| Archivo                                    | Responsabilidad                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `public/assets/logos/favicon.png`          | Recorte cuadrado del logo oficial para favicon                                      |
| `public/assets/patterns/institutional.svg` | Patrón decorativo propio de rombos escalonados                                      |
| `public/assets/logos/README.md`            | Procedencia y vigencia del logo oficial                                             |
| `public/assets/logos/eventanilla.png`      | Logo oficial E-Ventanilla entregado; reemplaza al recurso anterior                  |
| `tools/check-docs.mjs`                     | Cobertura de inventario y encabezados de responsabilidad                            |
| `tools/check-api.ts`                       | Comprobación opcional de GET reales mediante BFF efímero, sin cuentas ni escrituras |

## Pruebas y documentos

| Archivo                       | Responsabilidad                                                                |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `tests/domain.test.ts`        | Alcance, conservación histórica, capacidad, fechas, métricas y CSV             |
| `tests/bff.test.ts`           | Origen, sesiones opacas, campos privados, rutas y revocación, con API simulada |
| `tests/e2e/prototype.spec.ts` | Navegación, cambios, persistencia, perfiles, CSV, móvil y diagnósticos         |
| `docs/architecture.md`        | Responsabilidades, capas, flujos y límites del prototipo                       |
| `docs/routes-and-roles.md`    | Rutas y matriz de capacidades demostrativas                                    |
| `docs/design-system.md`       | Identidad, paleta, recursos, componentes y responsive                          |
| `docs/api-integration.md`     | Contrato vigente, sesiones reales y definición de reportes                     |
| `docs/project-context.md`     | Contexto único: objetivo, decisiones, cambios de BD y plan de integración      |
| `docs/pending-work.md`        | Trabajo pendiente en orden: BD en VPS, etapas API y conexión web               |
| `docs/file-map.md`            | Este inventario y criterio de documentación por archivo                        |

## Administración institucional conectada

| Archivo                                      | Responsabilidad                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `src/app/providers/admin-context.ts`         | Contrato de sesión y permisos por página                                    |
| `src/app/providers/AdminProvider.tsx`        | Identidad real, login, recuperación y cierre de sesión                      |
| `src/services/api/admin.ts`                  | Tipos y cliente administrativo, paginación y descarga CSV                   |
| `src/features/admin/AdminPanel.tsx`          | Selección de módulo real con guardas de permisos                            |
| `src/features/admin/AdminBranches.tsx`       | Sedes, edición, responsables y oferta de trámites con revisión              |
| `src/features/admin/AdminBranchForm.tsx`     | Formulario de sede por secciones con ubicación y publicación                |
| `src/features/admin/AssistedStaffDialog.tsx` | Alta asistida: genera archivo privado para el script de aprovisionamiento   |
| `src/features/admin/LocationPicker.tsx`      | Selector de latitud/longitud con mapa OpenStreetMap y búsqueda de dirección |
| `src/features/admin/AdminCatalog.tsx`        | Catálogo central real, costo nullable y publicación                         |
| `src/features/admin/AdminOperations.tsx`     | Horarios, personal, citas/atención y reportes paginados                     |
| `src/features/admin/AdminUI.tsx`             | Formularios de contrato, errores de campo, consulta y paginación            |
| `src/features/admin/admin-hooks.tsx`         | Consultas cancelables y aviso de salida con cambios                         |
| `src/features/admin/admin-fields.ts`         | Campos comunes de fuente y publicación                                      |
| `tests/e2e/admin.spec.ts`                    | Oferta persistida, permisos móvil y alta de catálogo con errores            |

## Generados y privados excluidos (reglas)

`node_modules/`: dependencias instaladas. `dist/`: build regenerable. `test-results/`, `playwright-report/`, `coverage/`: artefactos de verificación. `.env`: configuración privada no versionada. No editar estos archivos como fuentes ni mantener documentación individual de cada dependencia.
