/**
 * Prepara los logos entregados: copia original y recorta solo márgenes blancos.
 * Ejecutar desde apps/web con npm run assets. No altera el original de la raíz.
 * Sharp permite procesar el recurso binario de forma reproducible.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('../../../coesmerBACKGROUND.png', import.meta.url));
const target = fileURLToPath(new URL('../public/assets/logos/', import.meta.url));
await mkdir(target, { recursive: true });
await copyFile(source, `${target}/dependencia-original.png`);
const flattened = await sharp(source).flatten({ background: '#ffffff' }).png().toBuffer();
await sharp(flattened)
  .trim({ background: '#ffffff', threshold: 12 })
  .extend({ top: 14, bottom: 14, left: 14, right: 14, background: '#ffffff' })
  .png()
  .toFile(`${target}/dependencia.png`);
console.info('Logo original y variante de presentación preparados.');
