# Sistema visual institucional

## Identidad

Diseño original para una dependencia de Chiapas. El logo entregado se conserva y se usa sin alterar texto, colores o proporciones. El producto tiene un isotipo propio únicamente para favicon y nombre E-Ventanilla; no reemplaza emblema oficial.

## Paleta

| Token Tailwind  | Color     | Uso                                       |
| --------------- | --------- | ----------------------------------------- |
| `institutional` | `#009D86` | Acentos, gráficos y patrón                |
| `accent`        | `#FF0164` | Detalles secundarios, series y resaltados |
| `charcoal`      | `#312D2E` | Texto y títulos                           |
| `canvas`        | `#F7F4F2` | Fondo general                             |

`#007261` es un derivado oscuro para botones y texto verde sobre blanco. No se usa verde base con texto blanco pequeño cuando comprometa legibilidad. Estados incluyen texto e icono; nunca solo color.

## Patrón y logo

- `assets/patterns/institutional.svg`: rombos escalonados propios inspirados en la referencia. Decorativo, sin datos ni contenido esencial. Se usa como background en acceso y bienvenida.
- `assets/logos/dependencia-original.png`: copia intacta del recurso entregado.
- `assets/logos/dependencia.png`: recorte de márgenes blancos, generado por Sharp con padding. No se elimina contenido del logo.
- `InstitutionalLogo`: rutas, proporción y descripción centralizadas.

## Componentes

Botones con variantes primary/secondary/ghost/danger; campos con labels explícitos; estados con badges; tarjetas de métricas; paneles y tablas. Modales gestionan foco, Escape y restauración del foco. Mensajes de error usan `role=alert`, notificaciones usan `role=status`.

## Adaptación

Sidebar fijo en escritorio y desplegable en móvil. Tablas permiten desplazamiento horizontal dentro de su contenedor, no del documento completo. Filtros pasan de cuatro columnas a dos y una. Acceso oculta panel decorativo en móvil para priorizar selección de perfil. Se respeta `prefers-reduced-motion`.

## Tipografía

Stack `Manrope`, `Segoe UI`, sans-serif. Sin descargas externas obligatorias: el sistema usa fuente disponible. Tamaños, espaciados, contraste y responsive se mantienen en `styles/global.css`; Tailwind aporta utilidades y tokens.

## Simplicidad y formularios

- Inicio muestra tres indicadores y tres accesos; los gráficos viven en estadísticas desplegables de Reportes.
- Sedes utiliza secciones Información/Trámites/Horarios con una sección visible por vez.
- Campos agrupados mediante `FormSection` (fieldset/legend), labels de 13px y controles de 14px con fondos distinguibles.
- Obligatorios llevan asterisco y atributos HTML; errores de formato aparecen junto al campo con `aria-invalid` y `aria-describedby`.
- Los mensajes de validación son locales y breves, en español; se omite popup duplicado del navegador y se enfoca el primer campo inválido.
- Solo se muestran campos editables por perfil: jefe de ventanilla ve contacto, no campos deshabilitados de administración general.
- Acciones de formulario permanecen visibles al desplazar el modal.
- `Disclosure` usa details/summary para información secundaria. Reportes muestra mes y sede; fechas personalizadas y filtros adicionales se despliegan cuando se necesitan.
- Columnas se eligen en diálogo separado; tabla inicial tiene Folio, Sede, Trámite y Estado.
- Reportes presenta seis resultados por página; exportación conserva todos los resultados filtrados.
- Aviso de demostración es un distintivo compacto con explicación bajo demanda. Documentación técnica permanece accesible desde Configuración.
