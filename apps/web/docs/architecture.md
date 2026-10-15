# Arquitectura del prototipo

## Propósito y alcance

Una dependencia institucional administra sus sedes VUGE/VIM por municipio. Root prepara estructura y cuentas; jefe de departamento configura oferta y responsables; jefe de ventanilla consulta y opera dentro de sedes asignadas. Esta entrega permite validar interfaz y reglas con datos ficticios.

## Capas

```text
React Router
├── AuthLayout → acceso de demostración
└── DashboardLayout → navbar + sidebar + footer + Outlet
    └── features → páginas y componentes de cada módulo
        ├── DemoProvider → comandos → almacén ficticio local
        └── servicios API → /bff → API NestJS existente → PostgreSQL
```

### `app/`

Contiene configuración central, rutas y proveedores. La navegación se define una vez. `DashboardLayout` permanece montado al cambiar rutas internas; páginas no importan navbar, sidebar o footer.

### `features/`

Cada módulo agrupa páginas, formularios, contratos o selectores específicos. Lógica de reportes está separada de React. `auth/policy.ts` define alcance demostrativo reusable por selectores y comandos.

Inicio es una vista de orientación, sin tablas ni gráficos extensos. Reportes aplica información progresiva con `Disclosure` y diálogo de campos. Detalle de sede selecciona sección mediante ruta/query string; Horarios reutiliza `AvailabilityPage` en modo embebido con una única sede permitida. `FormSection` agrupa controles y `Field` gestiona errores de restricciones HTML sin sustituir validación de comandos.

### `components/`, `hooks/`, `utils/`, `types/`

Elementos compartidos con responsabilidad acotada. No contienen consultas SQL ni lógica institucional de la API. Los tipos son contratos locales, no una copia oficial de DTO.

### `mocks/`

`seed.ts` produce datos ficticios ligados al mes de referencia. `commands.ts` valida alcance y mantiene consistencia de cambios. El proveedor guarda el conjunto local completo después de una operación válida. Asociaciones sede-trámite se desactivan, no se eliminan al retirarlas de la oferta. Las citas históricas permanecen.

Ocupación de los bloques es un ejemplo independiente: el prototipo no implementa motor de reservas ni decrementa capacidad al simular cancelaciones. Simular atención crea tiempos ficticios en fecha de cita; no equivale a capturar asistencia.

### `server/`

BFF Express de mismo origen. Lista explícita de endpoints; no es un proxy arbitrario. Publica solo servicios públicos y sesión API. POST exige origen configurado y rechaza solicitudes cross-site. Tokens permanecen en memoria con fecha de expiración; cookie contiene ID aleatorio, es HttpOnly/SameSite=Strict y Secure en producción.

Este almacén de sesión es de un solo proceso y se vacía al reiniciar. La autenticación real del diagnóstico permanece separada del perfil ficticio. No existe acceso directo a PostgreSQL.

## Flujos principales

1. Seleccionar perfil demo → guardar ID ficticio en sessionStorage → rutas del panel.
2. Editar oferta → validar permisos demo y referencias → actualizar asociaciones → guardar localStorage → mostrar confirmación.
3. Consultar reporte → aplicar filtros dentro del alcance → calcular métricas → mostrar/exportar columnas seleccionadas.
4. GET real → navegador consulta BFF → BFF consulta URL privada configurada → respuesta pública.
5. Login API → BFF recibe credenciales transitoriamente → API devuelve sesión → BFF guarda token → devuelve identidad pública y cookie independiente.

## Criterio para integración futura

No resolver endpoints ausentes mediante escrituras SQL o un registro ciudadano con rol elegido en frontend. Cambiar servicios cuando exista contrato administrativo real. La API deberá proporcionar identidad, autorización y ámbito; las reglas locales de demo no son controles de seguridad de producción.
