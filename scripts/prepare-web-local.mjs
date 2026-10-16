/** Prepara identidades y fixtures exclusivamente en la BD local 55432; conserva contraseñas fuera de Git. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = parseEnv(readFileSync(resolve(root, 'apps/api/.env'), 'utf8'));
const url = new URL(env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432')
  throw new Error('Solo se permite la base aislada local en 55432.');
const require = createRequire(resolve(root, 'apps/api/package.json'));
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = await import('../apps/api/dist/generated/prisma/client.js');
const { hashPassword } = await import('../apps/api/dist/core/security/crypto.js');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
const accessPath = resolve(root, '.tools/web-local-access.json');
mkdirSync(resolve(root, '.tools'), { recursive: true });
const access = existsSync(accessPath)
  ? JSON.parse(readFileSync(accessPath, 'utf8'))
  : {
      url: 'http://127.0.0.1:5173',
      accounts: [
        {
          role: 'ROOT',
          email: 'root@local.example',
          curp: 'LOPR900101HCSXXX01',
          firstName: 'Root local',
          password: randomBytes(9).toString('base64url') + '7vQ',
        },
        {
          role: 'DEPARTMENT_HEAD',
          email: 'departamento@local.example',
          curp: 'LOPD900101HCSXXX02',
          firstName: 'Departamento local',
          password: randomBytes(9).toString('base64url') + '7vQ',
        },
        {
          role: 'COUNTER_HEAD',
          email: 'ventanilla@local.example',
          curp: 'LOPV900101HCSXXX03',
          firstName: 'Ventanilla local',
          password: randomBytes(9).toString('base64url') + '7vQ',
        },
      ],
    };
try {
  const municipality = await db.municipality.findUniqueOrThrow({ where: { code: '07101' } });
  for (const account of access.accounts) {
    if (await db.user.findUnique({ where: { email: account.email } })) continue;
    const role = await db.role.findUniqueOrThrow({ where: { code: account.role } });
    await db.user.create({
      data: {
        firstName: account.firstName,
        lastName: 'Prueba Local',
        paternalLastName: 'Prueba',
        maternalLastName: 'Local',
        curp: account.curp,
        email: account.email,
        passwordHash: await hashPassword(account.password),
        emailVerifiedAt: new Date(),
        municipality: municipality.name,
        municipalityCode: municipality.code,
        roleId: role.id,
        administrativeStaff: {
          create: {
            ...(account.role === 'DEPARTMENT_HEAD' ? { departmentHead: { create: {} } } : {}),
            ...(account.role === 'COUNTER_HEAD'
              ? { counterHead: { create: {} }, counterStaff: { create: {} } }
              : {}),
          },
        },
      },
    });
  }
  const branch = await db.branch.upsert({
    where: { sourceKey: 'web-local-fixture' },
    update: {},
    create: {
      sourceKey: 'web-local-fixture',
      name: 'Sede de prueba local',
      type: 'VIM',
      municipalityId: municipality.id,
      address: 'Datos ficticios · entorno local',
    },
  });
  await db.serviceCounter.upsert({
    where: { branchId_number: { branchId: branch.id, number: 1 } },
    update: {},
    create: { branchId: branch.id, number: 1 },
  });
  for (const [index, name] of ['Trámite local A', 'Trámite local B'].entries()) {
    await db.procedure.upsert({
      where: { sourceKey: `web-local-procedure-${index}` },
      update: {},
      create: {
        sourceKey: `web-local-procedure-${index}`,
        name,
        category: 'Pruebas locales',
        cost: index === 0 ? null : '0.00',
        estimatedMinutes: 30,
      },
    });
  }
  writeFileSync(accessPath, JSON.stringify(access, null, 2), { mode: 0o600 });
  console.info(
    'Entorno local preparado. Accesos privados en .tools/web-local-access.json. No se modificó producción.',
  );
} finally {
  await db.$disconnect();
}
