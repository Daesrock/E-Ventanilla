# Sistema visual institucional

## Identidad

Diseño original para una dependencia de Chiapas, con acabado estilo iOS 18 (radios amplios, sombras suaves, superficies translúcidas y transiciones breves). El logo oficial de E-Ventanilla fue entregado por el equipo y se usa sin alterar texto, colores o proporciones; reemplazó al recurso anterior de la dependencia y se usa también en la marca del producto y en el favicon. El emblema de la Comisión Estatal de Simplificación Administrativa aparece como crédito institucional en el menú lateral y en el pie del acceso.

## Paleta

| Token Tailwind  | Color     | Uso                                       |
| --------------- | --------- | ----------------------------------------- |
| `institutional` | `#149381` | Acentos, gráficos, patrón y acciones      |
| `accent`        | `#E97EAD` | Detalles secundarios, series y resaltados |
| `charcoal`      | `#333333` | Texto y títulos                           |
| `canvas`        | `#F4F4F6` | Fondo general                             |

Los tres primeros son los colores de las plataformas gubernamentales de Chiapas.
`#0E7568` (verde oscuro) y `#B04A7D` (rosa oscuro) son derivados para texto y
controles sobre blanco. No se usa color base con texto blanco pequeño cuando
comprometa legibilidad. Estados incluyen texto e icono; nunca solo color.

Radios y profundidad: `--radius-lg` 20px en paneles y tarjetas, `--radius-md` 14px
en campos y contenedores, botones de 13px y elementos pill en badges y pestañas.
Sombras suaves en dos capas (`--shadow-card`, `--shadow-pop`), barra superior con
`backdrop-filter` y entrada de página con desplazamiento breve. Todo respeta
`prefers-reduced-motion`.

## Patrón y logo

- `assets/patterns/institutional.svg`: rombos escalonados propios inspirados en la referencia. Decorativo, sin datos ni contenido esencial. Se usa como background en acceso y bienvenida.
- `assets/logos/eventanilla.png`: logo oficial E-Ventanilla entregado por el equipo (166×102). Reemplaza al recurso anterior de la dependencia.
- `assets/logos/coesmer.png`: emblema de la Comisión Estatal de Simplificación Administrativa, restaurado del historial como crédito institucional.
- `InstitutionalLogo`: rutas, proporción y descripción centralizadas; se muestra cercano a su tamaño nativo para no perder nitidez.
- `CoesmerLogo`: mismo criterio para el emblema de la Comisión; `ProductMark` usa el logo oficial del producto.

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
