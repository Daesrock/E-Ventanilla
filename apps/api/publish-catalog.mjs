import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './dist/generated/prisma/client.js';
import { environmentSecret } from './dist/core/configuration/environment.js';
import './check-bun.mjs';

// Importación revisada y explícita. No se ejecuta al arrancar la API.
const catalog = JSON.parse(
  readFileSync(new URL('../../database/catalog/coesa-2026-10-11.json', import.meta.url), 'utf8'),
);
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environmentSecret('DATABASE_URL') }),
});
try {
  const result = await database.$transaction(async (tx) => {
    const municipalities = await tx.municipality.findMany({ select: { id: true, code: true } });
    const branches = catalog.branches.map(({ municipalityCode, sourceCheckedAt, ...entry }) => {
      const municipality = municipalities.find((item) => item.code === municipalityCode);
      if (!municipality) throw new Error('Falta un municipio oficial para el catálogo.');
      return {
        ...entry,
        municipalityId: municipality.id,
        sourceCheckedAt: new Date(sourceCheckedAt),
        published: true,
      };
    });
    const procedures = catalog.procedures.map(({ sourceCheckedAt, ...entry }) => ({
      ...entry,
      sourceCheckedAt: new Date(sourceCheckedAt),
      published: true,
    }));
    // Las claves de origen hacen la operación repetible y preservan ediciones existentes.
    return {
      branches: (await tx.branch.createMany({ data: branches, skipDuplicates: true })).count,
      procedures: (await tx.procedure.createMany({ data: procedures, skipDuplicates: true })).count,
    };
  });
  console.log(JSON.stringify({ imported: result }));
} catch {
  console.error('No se publicó el catálogo; la transacción fue revertida.');
  process.exitCode = 1;
} finally {
  await database.$disconnect();
}
