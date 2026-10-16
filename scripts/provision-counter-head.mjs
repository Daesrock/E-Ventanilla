// Alta asistida de un jefe de ventanilla desde un JSON privado. Se ejecuta con
// Bun 1.4.2 contra la base de destino; nunca recibe contraseñas por argumentos ni
// las imprime. Valida con los DTO y la política de contraseña de la propia API.
import '../apps/api/check-bun.mjs';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const allowedFields = new Set([
  'firstName',
  'paternalLastName',
  'maternalLastName',
  'curp',
  'email',
  'password',
  'municipalityCode',
  'phone',
  'rfc',
  'branchIds',
  'counterStaff',
]);

async function main() {
  if (process.argv.length !== 3)
    throw new Error(
      'Indica únicamente la ruta del JSON privado generado por el panel (Alta asistida).',
    );
  let input;
  try {
    const path = resolve(process.argv[2]);
    const file = statSync(path);
    if (
      !file.isFile() ||
      file.size > 32768 ||
      (process.platform !== 'win32' && (file.mode & 0o077) !== 0)
    )
      throw new Error('Archivo no privado.');
    input = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    // JSON.parse puede incluir fragmentos de la entrada en su mensaje: no propagarlos.
    throw new Error('No se pudo leer un JSON privado válido. En Linux usa permisos 0600.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('El archivo debe contener un objeto JSON con los datos del jefe de ventanilla.');
  const unknown = Object.keys(input).filter((key) => !allowedFields.has(key));
  if (unknown.length) throw new Error(`El archivo contiene campos no permitidos: ${unknown.join(', ')}.`);
  const branchIds = input.branchIds ?? [];
  if (
    !Array.isArray(branchIds) ||
    branchIds.length > 100 ||
    branchIds.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) ||
    new Set(branchIds).size !== branchIds.length
  )
    throw new Error('Revisa el campo branchIds: deben ser identificadores de sede sin repetir.');
  if (input.counterStaff !== undefined && typeof input.counterStaff !== 'boolean')
    throw new Error('El campo counterStaff debe ser true o false.');

  const api = new URL('../apps/api/', import.meta.url);
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_FILE) {
    const env = fileURLToPath(new URL('.env', api));
    if (existsSync(env)) process.loadEnvFile(env);
  }
  const require = createRequire(new URL('package.json', api));
  require('reflect-metadata');
  const { plainToInstance } = require('class-transformer');
  const { validate } = require('class-validator');
  const { ConflictException } = require('@nestjs/common');
  const { environmentSecret } = await import('../apps/api/dist/core/configuration/environment.js');
  const connectionString = environmentSecret('DATABASE_URL');
  if (!/^postgres(?:ql)?:\/\//.test(connectionString))
    throw new Error('Configura DATABASE_URL o DATABASE_URL_FILE de la base de destino autorizada.');
  const { RegisterDto } = await import('../apps/api/dist/features/auth/auth.dto.js');
  const { registrationSurnames } = await import('../apps/api/dist/features/auth/surnames.js');
  const { requireNewPassword } = await import('../apps/api/dist/features/auth/password-policy.js');
  const { resolveMunicipality } = await import('../apps/api/dist/features/catalog/municipalities.js');
  const { hashPassword } = await import('../apps/api/dist/core/security/crypto.js');
  const { fieldFailure, validationFailure } = await import(
    '../apps/api/dist/core/validation/validation.js'
  );
  const { PrismaClient } = await import('../apps/api/dist/generated/prisma/client.js');
  const { PrismaPg } = require('@prisma/adapter-pg');

  const data = plainToInstance(RegisterDto, {
    firstName: input.firstName,
    paternalLastName: input.paternalLastName,
    maternalLastName: input.maternalLastName,
    curp: input.curp,
    email: input.email,
    password: input.password,
    municipalityCode: input.municipalityCode,
    phone: input.phone,
    rfc: input.rfc,
  });
  const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw validationFailure(errors);
  if (typeof data.municipalityCode !== 'string')
    throw fieldFailure({ municipalityCode: 'Selecciona un municipio de Chiapas.' });
  requireNewPassword(data.password);
  const municipality = resolveMunicipality(data.municipalityCode);
  const passwordHash = await hashPassword(data.password);

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const created = await db.$transaction(async (transaction) => {
      const role = await transaction.role.findUniqueOrThrow({ where: { code: 'COUNTER_HEAD' } });
      const existing = await transaction.user.findFirst({
        where: { OR: [{ email: data.email }, { curp: data.curp }] },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException(
          'Ya existe una cuenta con ese correo o CURP. No se promueven cuentas existentes.',
        );
      const origin = await transaction.municipality.findUnique({
        where: { code: municipality.code },
      });
      if (!origin) throw fieldFailure({ municipalityCode: 'El municipio no está registrado.' });
      const branches = branchIds.length
        ? await transaction.branch.findMany({
            where: { id: { in: branchIds } },
            select: { id: true },
          })
        : [];
      if (branches.length !== branchIds.length)
        throw fieldFailure({ branchIds: 'Alguna sede indicada no existe.' });
      const user = await transaction.user.create({
        data: {
          firstName: data.firstName,
          ...registrationSurnames(data),
          curp: data.curp,
          email: data.email,
          passwordHash,
          emailVerifiedAt: new Date(),
          municipality: origin.name,
          municipalityCode: origin.code,
          phone: data.phone,
          phoneCountryCode: data.phone ? '52' : null,
          rfc: data.rfc,
          roleId: role.id,
          administrativeStaff: {
            create: {
              counterHead: { create: {} },
              ...(input.counterStaff ? { counterStaff: { create: {} } } : {}),
            },
          },
        },
        select: { id: true },
      });
      const owner = await transaction.user.findFirst({
        where: { role: { code: 'ROOT' } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      const actorUserId = owner?.id ?? user.id;
      await transaction.administrativeAuditLog.create({
        data: {
          actorUserId,
          action: 'staff.create',
          resourceType: 'User',
          resourceId: user.id,
          outcome: 'completed',
          metadata: { source: 'alta-asistida' },
        },
      });
      for (const branch of branches) {
        await transaction.branch.update({
          where: { id: branch.id },
          data: { counterHeadId: user.id },
        });
        await transaction.administrativeAuditLog.create({
          data: {
            actorUserId,
            action: 'branch.head.assign',
            resourceType: 'Branch',
            resourceId: branch.id,
            branchId: branch.id,
            outcome: 'completed',
            metadata: { source: 'alta-asistida' },
          },
        });
      }
      return { id: user.id, assigned: branches.length };
    });
    console.info(
      `Jefe de ventanilla aprovisionado con auditoría. ID: ${created.id}. Sedes asignadas: ${created.assigned}.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  if (typeof error.getResponse === 'function') {
    const response = error.getResponse();
    const fields = typeof response === 'object' && response?.fieldErrors;
    console.error(
      fields
        ? `Revisa los campos: ${Object.keys(fields).join(', ')}.`
        : typeof response === 'object' && typeof response.message === 'string'
          ? response.message
          : 'No se pudo crear la cuenta del jefe de ventanilla.',
    );
  } else if (error.code || error.name === 'PrismaClientInitializationError') {
    console.error(
      'No se pudo aplicar el alta asistida. Revisa conexión, migraciones y permisos; no se modificaron cuentas existentes.',
    );
  } else {
    // Solo mensajes definidos en este script; nunca detalles de entrada o del servidor SQL.
    console.error(
      `No se pudo completar el alta asistida: ${error instanceof Error ? error.message : 'error desconocido'}.`,
    );
  }
  process.exitCode = 1;
});
