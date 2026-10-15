/**
 * Prepara los logos institucionales: conserva la copia original intacta y genera
 * la variante recortada solo de márgenes blancos. Ejecutar desde apps/web con
 * npm run assets. La fuente preferida es `coesmerBACKGROUND.png` en la raíz del
 * repositorio; si ya no está, reutiliza la copia conservada en public/assets/logos.
 * No modifica colores, texto ni proporciones del logotipo.
 */
import { access, copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const entregado = fileURLToPath(new URL('../../../coesmerBACKGROUND.png', import.meta.url));
const target = fileURLToPath(new URL('../public/assets/logos/', import.meta.url));
const preserved = `${target}/dependencia-original.png`;
await mkdir(target, { recursive: true });

let source = entregado;
try {
  await access(entregado);
  await copyFile(entregado, preserved);
} catch {
  try {
    await access(preserved);
    source = preserved;
  } catch {
    throw new Error(
      'No hay logo para preparar: coloca coesmerBACKGROUND.png en la raíz del repositorio o conserva public/assets/logos/dependencia-original.png.',
    );
  }
}

const flattened = await sharp(source).flatten({ background: '#ffffff' }).png().toBuffer();
await sharp(flattened)
  .trim({ background: '#ffffff', threshold: 12 })
  .extend({ top: 14, bottom: 14, left: 14, right: 14, background: '#ffffff' })
  .png()
  .toFile(`${target}/dependencia.png`);
console.info('Logo original y variante de presentación preparados.');
