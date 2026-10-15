/** Formatos compartidos: pesos mexicanos, fechas de Chiapas y descarga CSV segura. */
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
});
const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Mexico_City',
});

export const currency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
export const number = (value: number) => new Intl.NumberFormat('es-MX').format(value);
export const dateLabel = (value: string) =>
  dateFormatter.format(new Date(value.length === 10 ? `${value}T12:00:00-06:00` : value));
export const timeLabel = (value: string) => timeFormatter.format(new Date(value));
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

/** Obtiene fecha civil institucional, independiente de la zona horaria del navegador. */
export function localDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

/** Escapa CSV y neutraliza fórmulas para no ejecutar contenido al abrir en una hoja de cálculo. */
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** Descarga únicamente datos seleccionados de la demostración, en CSV UTF-8. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
