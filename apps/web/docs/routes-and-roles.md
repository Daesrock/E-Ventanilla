# Rutas y perfiles

Documento de la navegación y permisos **demostrativos**. La API vigente no permite identificar ni autorizar estos perfiles administrativos.

| Ruta                              | Propósito                                       | Root                  | Departamento          | Ventanilla               |
| --------------------------------- | ----------------------------------------------- | --------------------- | --------------------- | ------------------------ |
| `/acceso`                         | Selección de perfil ficticio y restablecimiento | Sí                    | Sí                    | Sí                       |
| `/inicio`                         | Indicadores mensuales y accesos por tarea       | Dependencia           | Dependencia           | Sedes asignadas          |
| `/sedes`                          | Directorio                                      | Crear/consultar       | Consultar             | Asignadas                |
| `/sedes/:sedeId`                  | Información, responsable y oferta               | Configurar            | Configurar            | Contacto y consulta      |
| `/sedes/:sedeId/tramites`         | Sección de trámites disponibles                 | Configurar            | Configurar            | Consultar                |
| `/sedes/:sedeId?seccion=horarios` | Horarios dentro de la sede                      | Configurar            | Configurar            | Sedes asignadas          |
| `/tramites`                       | Catálogo central y costos                       | Crear/editar          | Crear/editar          | Consultar                |
| `/disponibilidad`                 | Bloques de atención                             | Configurar            | Configurar            | Configurar en su alcance |
| `/citas`                          | Citas y acciones simuladas                      | Dependencia           | Dependencia           | Sedes asignadas          |
| `/reportes`                       | Estadísticas y CSV                              | Dependencia           | Dependencia           | Sedes asignadas          |
| `/usuarios`                       | Cuentas y responsables                          | Crear/editar jefes    | Consultar             | Cuenta propia            |
| `/conexion`                       | Diagnósticos y sesión real opcional             | Sí                    | Sí                    | Sí                       |
| `/configuracion`                  | Opciones secundarias e integración              | Consultar/restablecer | Consultar/restablecer | Consultar                |
| Otras                             | Página 404 dentro del layout                    | Sí                    | Sí                    | Sí                       |

## Reglas

La vista de integración vive en `/configuracion/conexion`. `/conexion` redirige allí para conservar enlaces previos y mantener Configuración activa en navegación.

- Un jefe de ventanilla puede estar asociado a varias sedes: `Branch.counterHeadId` no muestra una restricción que obligue a una sola. La demo inicial tiene dos sedes de Tuxtla con un mismo responsable.
- `StaffAssignment` representa personal de atención `CounterStaff`, no asignación del jefe. No se utiliza para inventar esa relación.
- Solo root crea cuentas de jefes; no se crean otros roots desde la interfaz.
- Las cuentas ficticias activas se pueden seleccionar en acceso para probar asignaciones nuevas.
- Jefe de departamento asigna responsables desde el detalle de sede.
- El costo pertenece al catálogo central y afecta todas las sedes.
- Jefe de ventanilla no cambia nombre, municipio, tipo, responsable, activación/publicación de sede ni catálogo central. Puede actualizar contacto/dirección y bloques locales.
- Cuentas inactivas carecen de alcance. Desactivar un responsable conserva referencia histórica; la sede muestra que su cuenta está inactiva.
- Reportes y CSV se filtran antes de exportar; no incluyen sedes fuera del alcance demostrativo.

## Componentes únicos

Navbar, sidebar y footer viven en `DashboardLayout`. React Router renderiza páginas en `Outlet`. La barra superior consulta configuración de navegación para título de ruta. Menú móvil utiliza mismo sidebar; no se mantienen listas duplicadas.

La navegación utiliza nombres breves: Inicio, Sedes, Trámites, Horarios, Citas, Reportes y Responsables (Mi cuenta para jefe de ventanilla). La conexión técnica se accede desde Configuración. El distintivo Demostración abre explicación del entorno sin repetir avisos largos en cada página.
