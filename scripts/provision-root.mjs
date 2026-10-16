/** Aprovisiona una cuenta ROOT nueva con Prisma y hash de API; entrada privada por archivo, nunca contraseña en argumentos. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2])
  throw new Error('Indica la ruta de un JSON privado con los datos corroborados del titular.');
if (existsSync(resolve(root, 'apps/api/.env'))) process.loadEnvFile(resolve(root, 'apps/api/.env'));
const require = createRequire(resolve(root, 'apps/api/package.json'));
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
await import('../apps/api/node_modules/reflect-metadata/Reflect.js');
const { RegisterDto } = await import('../apps/api/dist/features/auth/auth.dto.js');
const { registrationSurnames } = await import('../apps/api/dist/features/auth/surnames.js');
const { resolveMunicipality } = await import('../apps/api/dist/features/catalog/municipalities.js');
const { hashPassword } = await import('../apps/api/dist/core/security/crypto.js');
const { config } = await import('../apps/api/dist/core/configuration/config.js');
const { PrismaClient } = await import('../apps/api/dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');
const data = plainToInstance(
  RegisterDto,
  JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8')),
);
const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
if (errors.length)
  throw new Error(
    `Revisa los campos del archivo privado: ${errors.map((error) => error.property).join(', ')}`,
  );
const municipality = resolveMunicipality(data.municipalityCode, data.municipality);
const passwordHash = await hashPassword(data.password);
if (!config.databaseUrl)
  throw new Error('Falta DATABASE_URL o DATABASE_URL_FILE de la base de destino.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
try {
  const user = await db.$transaction(async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { code: 'ROOT' } });
    if (!role.active) throw new Error('El rol ROOT está inactivo.');
    if (
      await tx.user.findFirst({
        where: { OR: [{ email: data.email }, { curp: data.curp }] },
        select: { id: true },
      })
    )
      throw new Error(
        'Ya existe una cuenta con ese correo o CURP. No se modifica ni promueve ninguna cuenta existente.',
      );
    const origin = await tx.municipality.findUniqueOrThrow({ where: { code: municipality.code } });
    const created = await tx.user.create({
      data: {
        firstName: data.firstName,
        ...registrationSurnames(data),
        email: data.email,
        curp: data.curp,
        passwordHash,
        municipality: origin.name,
        municipalityCode: origin.code,
        emailVerifiedAt: new Date(),
        roleId: role.id,
        phone: data.phone,
        phoneCountryCode: data.phone ? '52' : null,
        rfc: data.rfc,
        administrativeStaff: { create: {} },
      },
      select: { id: true },
    });
    await tx.administrativeAuditLog.create({
      data: {
        actorUserId: created.id,
        action: 'staff.bootstrap',
        resourceType: 'User',
        resourceId: created.id,
      },
    });
    return created;
  });
  console.info(
    `ROOT aprovisionado con auditoría. ID: ${user.id}. No se imprimen contraseña ni hash.`,
  );
} catch (error) {
  if (error?.code)
    throw new Error(
      `No se pudo aprovisionar ROOT (código ${error.code}). La transacción se revirtió.`,
    );
  throw error;
} finally {
  await db.$disconnect();
}
