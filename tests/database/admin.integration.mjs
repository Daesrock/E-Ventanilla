// Solo bases efímeras: localhost:55432 (CI) o el contenedor privado admin-test-db.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';

const root = new URL('../../', import.meta.url);
const apiDir = new URL('apps/api/', root);
const require = createRequire(new URL('package.json', apiDir));
require('reflect-metadata');
const { Client } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = await import('../../apps/api/dist/generated/prisma/client.js');
const { StaffAdminService } = await import(
  '../../apps/api/dist/features/admin/staff.admin.service.js'
);
const { BranchesAdminService } = await import(
  '../../apps/api/dist/features/admin/branches.admin.service.js'
);
const { SlotsAdminService } = await import(
  '../../apps/api/dist/features/admin/slots.admin.service.js'
);
const { AppointmentsAdminService } = await import(
  '../../apps/api/dist/features/admin/appointments.admin.service.js'
);
const { ReportsAdminService } = await import(
  '../../apps/api/dist/features/admin/reports.admin.service.js'
);
const { PublicCatalogService } = await import(
  '../../apps/api/dist/features/catalog/public-catalog.service.js'
);
const { SessionService } = await import('../../apps/api/dist/features/sessions/session.service.js');
const { provisionRoot } = await import('../../apps/api/dist/features/admin/root-provisioning.js');
const { hashPassword, verifyPassword, tokenDigest } = await import(
  '../../apps/api/dist/core/security/crypto.js'
);

const connection =
  process.env.EV_TEST_POSTGRES_URL ??
  parseEnv(readFileSync(new URL('apps/api/.env', root), 'utf8')).DATABASE_URL;
const source = new URL(connection);
assert.ok(
  (['localhost', '127.0.0.1'].includes(source.hostname) && source.port === '55432') ||
    (source.hostname === 'admin-test-db' && (!source.port || source.port === '5432')),
  'La prueba solo permite PostgreSQL aislado.',
);
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const databaseName = `ev_admin_${suffix}`;
const freshName = `ev_admin_fresh_${suffix}`;
const roles = Object.fromEntries(
  ['api', 'migrator', 'backup'].map((name) => [name, `ev_admin_${name}_${suffix}`]),
);
const password = randomBytes(24).toString('hex');
const url = new URL(databaseName, source).href;
const admin = new Client({ connectionString: new URL('postgres', source).href });
const sql = new Client({ connectionString: url });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 5 }) });
const checks = [];
const check = async (name, action) => {
  await action();
  checks.push(name);
  console.log(`OK ${name}`);
};
const renamed = (text) =>
  Object.entries(roles).reduce(
    (result, [name, value]) => result.replaceAll(`eventanilla_${name}`, value),
    text,
  );
const migrationsDir = new URL('database/prisma/migrations/', root);
const migrationNames = readdirSync(migrationsDir)
  .filter((name) => /^\d/.test(name))
  .sort();
const field = (name) => (error) => error.getResponse?.().fieldErrors?.[name] !== undefined;
let runtime;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  await sql.connect();
  for (const role of Object.values(roles))
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);
  for (const name of migrationNames.filter((name) => name < '202610140001'))
    await sql.query(readFileSync(new URL(`${name}/migration.sql`, migrationsDir), 'utf8'));
  const municipality = await db.municipality.findFirstOrThrow();
  const citizenRole = await db.role.findUniqueOrThrow({ where: { code: 'CITIZEN' } });
  const oldHash = await hashPassword('ClaveAnterior12');
  const citizen = await db.user.create({
    data: {
      firstName: 'Fixture',
      lastName: 'Anterior',
      paternalLastName: 'Anterior',
      curp: 'AAAA000101HCSBBB09',
      email: 'citizen@example.invalid',
      passwordHash: oldHash,
      municipality: municipality.name,
      municipalityCode: municipality.code,
      roleId: citizenRole.id,
      emailVerifiedAt: new Date(),
      citizen: { create: { municipalityId: municipality.id } },
    },
  });
  const oldToken = 'x'.repeat(43);
  await db.session.create({
    data: {
      userId: citizen.id,
      digest: tokenDigest(oldToken),
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  await check(
    'actualización aditiva conserva ciudadano, contraseña y sesión existentes',
    async () => {
      for (const name of migrationNames.filter((name) => name >= '202610140001'))
        await sql.query(
          renamed(readFileSync(new URL(`${name}/migration.sql`, migrationsDir), 'utf8')),
        );
      const unchanged = await db.user.findUniqueOrThrow({ where: { id: citizen.id } });
      assert.equal(unchanged.passwordHash, oldHash);
      assert.equal(await verifyPassword('ClaveAnterior12', unchanged.passwordHash), true);
      assert.equal((await new SessionService(db).authenticate(oldToken)).user.id, citizen.id);
    },
  );
  await check('matriz de permisos: ROOT 18, departamento 13, ventanilla 8', async () => {
    for (const [code, count] of [
      ['ROOT', 18],
      ['DEPARTMENT_HEAD', 13],
      ['COUNTER_HEAD', 8],
    ]) {
      const row = await db.role.findUniqueOrThrow({
        where: { code },
        include: { _count: { select: { permissions: true } } },
      });
      assert.equal(row._count.permissions, count, code);
    }
  });
  const rootRole = await db.role.findUniqueOrThrow({ where: { code: 'ROOT' } });
  const rootInput = {
    firstName: 'Fixture',
    paternalLastName: 'Administrador',
    curp: 'BABB000101HCSBBB09',
    email: 'owner@example.invalid',
    password: 'ClaveTecnica12',
    municipalityCode: municipality.code,
  };
  await check('ROOT: un fallo de auditoría revierte identidad y perfil completos', async () => {
    const failing = new Proxy(db, {
      get(target, key) {
        if (key === '$transaction')
          return (action) =>
            target.$transaction((transaction) =>
              action(
                new Proxy(transaction, {
                  get(tx, property) {
                    return property === 'administrativeAuditLog'
                      ? {
                          create: async () => {
                            throw new Error('Fallo técnico de auditoría.');
                          },
                        }
                      : Reflect.get(tx, property);
                  },
                }),
              ),
            );
        return Reflect.get(target, key);
      },
    });
    await assert.rejects(provisionRoot(failing, rootInput), /técnico/);
    assert.equal(await db.user.count({ where: { roleId: rootRole.id } }), 0);
    assert.equal(await db.administrativeStaff.count(), 0);
    assert.equal(await db.administrativeAuditLog.count(), 0);
  });
  let owner;
  await check(
    'ROOT concurrente: solo una cuenta inicial, con perfil y auditoría sin credenciales',
    async () => {
      const attempts = await Promise.allSettled([
        provisionRoot(db, rootInput),
        provisionRoot(db, {
          ...rootInput,
          curp: 'DABB000101HCSBBB09',
          email: 'second@example.invalid',
        }),
      ]);
      assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(
        attempts.filter((r) => r.status === 'rejected' && r.reason.getStatus() === 409).length,
        1,
      );
      owner = await db.user.findUniqueOrThrow({
        where: { id: attempts.find((r) => r.status === 'fulfilled').value.id },
      });
      assert.equal(await db.citizen.count({ where: { userId: owner.id } }), 0);
      assert.equal(await db.administrativeStaff.count({ where: { userId: owner.id } }), 1);
      assert.equal(await verifyPassword(rootInput.password, owner.passwordHash), true);
      const audit = await db.administrativeAuditLog.findFirstOrThrow({
        where: { action: 'staff.bootstrap' },
      });
      assert.equal(audit.actorUserId, owner.id);
      assert.equal(audit.metadata, null);
      await assert.rejects(provisionRoot(db, rootInput), (error) => error.getStatus() === 409);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).passwordHash,
        owner.passwordHash,
      );
      assert.equal(await db.user.count({ where: { roleId: rootRole.id } }), 1);
    },
  );
  // Perfil técnico exclusivamente del fixture que ejercita las atenciones.
  await db.counterStaff.create({ data: { userId: owner.id } });
  const context = {
    userId: owner.id,
    allBranches: true,
    branchIds: [],
    role: { code: 'ROOT' },
    staffProfiles: { counterStaff: true, counterHead: false, departmentHead: false },
  };
  const staff = new StaffAdminService(db);
  const branches = new BranchesAdminService(db);
  const slots = new SlotsAdminService(db);
  const appointments = new AppointmentsAdminService(db);
  const reports = new ReportsAdminService(db);
  let head;
  let branch;
  await check(
    'alta administrativa crea identidad y perfiles, sin ciudadano ni NSS inventado',
    async () => {
      head = await staff.create(context, {
        firstName: 'Fixture',
        paternalLastName: 'Ventanilla',
        curp: 'CABB000101HCSBBB09',
        email: 'head@example.invalid',
        password: 'ClaveTecnica12',
        municipalityCode: municipality.code,
        role: 'COUNTER_HEAD',
        counterStaff: false,
      });
      assert.equal(head.profiles.counterHead, true);
      assert.equal(head.address.socialSecurityNumber, null);
      assert.equal(await db.citizen.count({ where: { userId: head.id } }), 0);
      assert.equal(await db.administrativeAuditLog.count({ where: { action: 'staff.create' } }), 1);
    },
  );
  await check('fallo de auditoría revierte también cambios de perfil y de cuenta', async () => {
    // Conserva Prisma real y provoca únicamente el fallo final de la auditoría.
    const failing = new Proxy(db, {
      get(target, key) {
        if (key === '$transaction')
          return (action) =>
            target.$transaction((tx) =>
              action(
                new Proxy(tx, {
                  get(transaction, property) {
                    return property === 'administrativeAuditLog'
                      ? {
                          create: async () => {
                            throw new Error('Fallo técnico controlado de auditoría.');
                          },
                        }
                      : Reflect.get(transaction, property);
                  },
                }),
              ),
            );
        return Reflect.get(target, key);
      },
    });
    await assert.rejects(
      new StaffAdminService(failing).update(context, head.id, {
        counterStaff: true,
        phone: '0123456789',
      }),
      /controlado/,
    );
    assert.equal(await db.counterStaff.count({ where: { userId: head.id } }), 0);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: head.id } })).phone, null);
  });
  await check('publicación exige fuente y el catálogo conserva su contrato', async () => {
    await assert.rejects(
      branches.create(context, {
        name: 'Fixture aislada',
        type: 'VIM',
        municipalityCode: municipality.code,
        published: true,
      }),
      field('sourceKey'),
    );
    branch = await branches.create(context, {
      name: 'Fixture aislada',
      type: 'VIM',
      municipalityCode: municipality.code,
    });
    assert.equal(branch.published, false);
    const sourceFields = {
      published: true,
      sourceKey: 'technical-isolated',
      sourceUrl: 'https://example.invalid/source',
      sourceSha256: 'a'.repeat(64),
      sourceCheckedAt: new Date().toISOString(),
    };
    await branches.update(context, branch.id, sourceFields);
    const catalog = new PublicCatalogService(db);
    const publicBranch = await catalog.branch(branch.id);
    assert.equal(publicBranch.municipalityCode, municipality.code);
    assert.equal(publicBranch.latitude, null);
    assert.equal('counterHeadId' in publicBranch, false);
    assert.deepEqual(await catalog.branchProcedures(branch.id), { items: [] });
  });
  await check('asignación explícita y restricciones del jefe de ventanilla', async () => {
    await assert.rejects(branches.assignHead(context, branch.id, {}), field('counterHeadId'));
    await branches.assignHead(context, branch.id, { counterHeadId: head.id });
    const scoped = {
      ...context,
      userId: head.id,
      role: { code: 'COUNTER_HEAD' },
      allBranches: false,
      branchIds: [branch.id],
    };
    await assert.rejects(
      branches.update(scoped, branch.id, { published: false }),
      field('published'),
    );
    await assert.rejects(
      branches.offersFor({ ...scoped, branchIds: [] }, branch.id),
      (e) => e.getStatus() === 403,
    );
    const changed = await branches.update(scoped, branch.id, { phone: 'Contacto técnico aislado' });
    assert.equal(changed.phone, 'Contacto técnico aislado');
  });
  let slot;
  await check('horarios concurrentes superpuestos: solo uno se guarda y se audita', async () => {
    const before = await db.administrativeAuditLog.count({ where: { action: 'slot.create' } });
    const results = await Promise.allSettled([
      slots.create(context, branch.id, {
        date: '2099-01-01',
        startsAt: '09:00',
        endsAt: '10:00',
        capacity: 2,
      }),
      slots.create(context, branch.id, {
        date: '2099-01-01',
        startsAt: '09:30',
        endsAt: '10:30',
        capacity: 2,
      }),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      results.filter((r) => r.status === 'rejected' && field('startsAt')(r.reason)).length,
      1,
    );
    assert.equal(
      await db.administrativeAuditLog.count({ where: { action: 'slot.create' } }),
      before + 1,
    );
    slot = results.find((r) => r.status === 'fulfilled').value;
  });
  const procedure = await db.procedure.create({ data: { name: 'Fixture aislado' } });
  await branches.updateOffers(context, branch.id, {
    items: [{ procedureId: procedure.id, active: true }],
  });
  const counter = await db.serviceCounter.create({ data: { branchId: branch.id, number: 1 } });
  await check(
    'mostradores: solo la sede solicitada, orden numérico e inactivos identificados',
    async () => {
      await db.serviceCounter.create({ data: { branchId: branch.id, number: 2, active: false } });
      const other = await db.branch.create({
        data: { municipalityId: municipality.id, name: 'Fixture aislado ajeno', type: 'VIM' },
      });
      await db.serviceCounter.create({ data: { branchId: other.id, number: 3 } });
      const result = await branches.countersFor(context, branch.id);
      assert.deepEqual(
        result.items.map((item) => [item.number, item.active]),
        [
          [1, true],
          [2, false],
        ],
      );
      assert.equal(result.items[0].id, counter.id);
    },
  );
  const appointment = await db.appointment.create({
    data: {
      folio: randomUUID(),
      citizenId: citizen.id,
      branchId: branch.id,
      procedureId: procedure.id,
      slotId: slot.id,
      scheduledAt: new Date('2099-01-01T15:00:00Z'),
      status: 'ISOLATED_FIXTURE',
      qrToken: randomUUID(),
    },
  });
  await check('capacidad derivada y horario reservado protegidos', async () => {
    await assert.rejects(slots.update(context, slot.id, { capacity: 0 }), field('capacity'));
    await assert.rejects(slots.update(context, slot.id, { startsAt: '08:00' }), field('startsAt'));
    const updated = await slots.update(context, slot.id, { capacity: 3 });
    assert.equal(updated.occupied, 1);
    assert.equal(updated.capacity, 3);
  });
  await check('atención concurrente: llegada e inicio únicos, secuencia conservada', async () => {
    await assert.rejects(
      appointments.attendance(context, appointment.id, { action: 'end' }),
      field('action'),
    );
    for (const data of [{ action: 'arrive', counterId: counter.id }, { action: 'start' }]) {
      const results = await Promise.allSettled([
        appointments.attendance(context, appointment.id, data),
        appointments.attendance(context, appointment.id, data),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(
        results.filter((r) => r.status === 'rejected' && r.reason.getStatus() === 409).length,
        1,
      );
    }
    await appointments.attendance(context, appointment.id, { action: 'end' });
    assert.equal(
      (await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status,
      'ISOLATED_FIXTURE',
    );
    assert.equal(
      await db.administrativeAuditLog.count({
        where: { action: { startsWith: 'appointment.attendance.' } },
      }),
      3,
    );
  });
  await check('reportes y CSV comparten filtros, cohorte y alcance', async () => {
    const query = { from: '2099-01-01', to: '2099-01-01', branchId: branch.id, pageSize: '1' };
    const result = await reports.report(context, query);
    assert.equal(result.summary.appointments, 1);
    assert.equal(result.summary.completed, 1);
    assert.equal(result.summary.citizens, 1);
    const exported = await reports.exportCsv(context, { ...query, columns: 'folio,late' });
    assert.ok(exported.body.includes(appointment.folio));
    const scoped = { ...context, allBranches: false, branchIds: [] };
    assert.equal(
      (await reports.report(scoped, { from: '2099-01-01', to: '2099-01-01' })).summary.appointments,
      0,
    );
  });
  await check('desactivar personal revoca sesiones y no toca contraseñas', async () => {
    await db.session.create({
      data: {
        userId: head.id,
        digest: tokenDigest('y'.repeat(43)),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    const before = (await db.user.findUniqueOrThrow({ where: { id: head.id } })).passwordHash;
    await staff.update(context, head.id, { active: false });
    assert.equal(await db.session.count({ where: { userId: head.id } }), 0);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: head.id } })).passwordHash,
      before,
    );
  });
  await check(
    'permisos SQL: API lee autorizaciones y agrega auditoría, sin alterarlas ni borrarlas',
    async () => {
      await sql.query('CREATE TABLE _prisma_migrations(id text PRIMARY KEY)');
      await sql.query(
        renamed(readFileSync(new URL('database/permissions/runtime.sql', root), 'utf8')),
      );
      const runtimeUrl = new URL(url);
      runtimeUrl.username = roles.api;
      runtimeUrl.password = password;
      runtime = new Client({ connectionString: runtimeUrl.href });
      await runtime.connect();
      for (const statement of [
        'UPDATE "Role" SET active=false',
        'DELETE FROM "AdministrativeAuditLog"',
        'UPDATE "AdministrativeAuditLog" SET outcome=\'failed\'',
        'TRUNCATE "AdministrativeAuditLog"',
      ])
        await assert.rejects(runtime.query(statement), (e) => e.code === '42501');
      await runtime.query('SELECT code FROM "Permission"');
      await runtime.query(
        'INSERT INTO "AdministrativeAuditLog" (id,"actorUserId",action,"resourceType") VALUES ($1,$2,$3,$4)',
        [randomUUID(), owner.id, 'technical.test', 'User'],
      );
    },
  );
  await check(
    'API completa con rol SQL restringido: Android y administración funcionan juntas',
    async () => {
      const administratorToken = 'a'.repeat(43);
      await db.session.create({
        data: {
          userId: owner.id,
          digest: tokenDigest(administratorToken),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      const runtimeUrl = new URL(url);
      runtimeUrl.username = roles.api;
      runtimeUrl.password = password;
      const port = 30000 + Math.floor(Math.random() * 20000);
      const base = `http://127.0.0.1:${port}/v1/`;
      const server = Bun.spawn([process.execPath, 'dist/main.js'], {
        cwd: apiDir.pathname.replace(/^\/(\w:)/, '$1'),
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port),
          DATABASE_URL: runtimeUrl.href,
          DATABASE_URL_FILE: undefined,
          AUTH_CODE_SECRET: '0'.repeat(64),
          AUTH_CODE_SECRET_FILE: undefined,
          RESEND_API_KEY: '',
          RESEND_API_KEY_FILE: undefined,
          RESEND_FROM: '',
          RESEND_FROM_FILE: undefined,
          OSRM_BASE_URL: '',
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      try {
        let ready = false;
        for (let attempt = 0; attempt < 40; attempt++) {
          try {
            if ((await fetch(base + 'ready', { signal: AbortSignal.timeout(1000) })).ok) {
              ready = true;
              break;
            }
          } catch {}
          if (server.exitCode !== null) break;
          await Bun.sleep(150);
        }
        assert.equal(ready, true, 'La API completa debe arrancar con la cuenta SQL de ejecución.');
        const request = (path, token = administratorToken, options = {}) =>
          fetch(base + path, {
            ...options,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000),
          });
        assert.equal((await request('auth/me', oldToken)).status, 200);
        assert.equal((await request('admin/me', oldToken)).status, 403);
        const identity = await request('admin/me');
        assert.equal(identity.status, 200);
        assert.equal((await identity.json()).permissions.length, 18);
        assert.equal((await request('admin/branches')).status, 200);
        const counters = await request(`admin/branches/${branch.id}/counters`);
        assert.equal(counters.status, 200);
        assert.deepEqual(
          (await counters.json()).items.map((item) => [item.number, item.active]),
          [
            [1, true],
            [2, false],
          ],
        );
        assert.equal((await request(`catalog/branches/${branch.id}/procedures`)).status, 200);
        const nearby = await request('catalog/branches/nearby', administratorToken, {
          method: 'POST',
          body: JSON.stringify({ latitude: 0, longitude: 0, branchIds: [branch.id] }),
        });
        assert.equal(nearby.status, 200);
        assert.equal((await nearby.json()).status, 'no_coordinates');
        const updated = await request(`admin/time-slots/${slot.id}`, administratorToken, {
          method: 'PATCH',
          body: JSON.stringify({ capacity: 4 }),
        });
        assert.equal(updated.status, 200);
        assert.equal((await updated.json()).occupied, 1);
        const login = await request('auth/login', oldToken, {
          method: 'POST',
          body: JSON.stringify({ identifier: citizen.email, password: 'ClaveAnterior12' }),
        });
        assert.equal(login.status, 201);
        assert.equal((await login.json()).user.id, citizen.id);
        // Prueba opcional con el BFF exacto de la rama web, montado fuera del código productivo.
        if (process.env.EV_TEST_BFF_ENTRY && process.env.EV_TEST_BFF_CHECK) {
          const { checkBff } = await import(process.env.EV_TEST_BFF_CHECK);
          await db.user.update({ where: { id: head.id }, data: { active: true } });
          const other = await db.branch.findFirstOrThrow({ where: { id: { not: branch.id } } });
          await check(
            'BFF de bry con API y PostgreSQL reales: sesión, mostradores, permisos y errores',
            () =>
              checkBff({
                entry: process.env.EV_TEST_BFF_ENTRY,
                apiBaseUrl: base,
                root: { email: owner.email, password: rootInput.password },
                citizen: { email: citizen.email, password: 'ClaveAnterior12' },
                head: { email: head.email, password: 'ClaveTecnica12' },
                branchId: branch.id,
                otherBranchId: other.id,
                slotId: slot.id,
              }),
          );
        }
      } finally {
        server.kill();
        await server.exited;
        await Promise.all([new Response(server.stdout).text(), new Response(server.stderr).text()]);
      }
    },
  );
  await check(
    'Prisma migrate deploy instala todas las migraciones desde una base vacía',
    async () => {
      await admin.query(`CREATE DATABASE "${freshName}"`);
      const freshUrl = new URL(freshName, source).href;
      const migrated = Bun.spawnSync(
        [process.execPath, 'node_modules/prisma/build/index.js', 'migrate', 'deploy'],
        {
          cwd: apiDir.pathname.replace(/^\/(\w:)/, '$1'),
          env: { ...process.env, DATABASE_URL: freshUrl, DATABASE_URL_FILE: undefined },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      if (migrated.exitCode) throw new Error(migrated.stderr.toString());
      const fresh = new Client({ connectionString: freshUrl });
      await fresh.connect();
      try {
        assert.equal(
          (
            await fresh.query(
              'SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL',
            )
          ).rows[0].n,
          migrationNames.length,
        );
        const directory = mkdtempSync(join(tmpdir(), 'ev-root-integration-'));
        try {
          const inputFile = join(directory, 'root.private.json');
          const connectionFile = join(directory, 'database-url.private');
          writeFileSync(inputFile, JSON.stringify(rootInput), { mode: 0o600 });
          writeFileSync(connectionFile, freshUrl, { mode: 0o600 });
          const run = () =>
            Bun.spawnSync(
              [
                process.execPath,
                new URL('scripts/provision-root.mjs', root).pathname.replace(/^\/(\w:)/, '$1'),
                inputFile,
              ],
              {
                env: { ...process.env, DATABASE_URL: undefined, DATABASE_URL_FILE: connectionFile },
                stdout: 'pipe',
                stderr: 'pipe',
                timeout: 15000,
              },
            );
          const created = run();
          assert.equal(created.exitCode, 0, created.stderr.toString());
          const output = created.stdout.toString() + created.stderr.toString();
          assert.ok(output.includes('aprovisionada'));
          assert.equal(output.includes(rootInput.password), false);
          assert.equal(output.includes('scrypt$'), false);
          const before = (await fresh.query('SELECT id,"passwordHash" FROM "User"')).rows;
          const repeated = run();
          assert.equal(repeated.exitCode, 1);
          assert.deepEqual(
            (await fresh.query('SELECT id,"passwordHash" FROM "User"')).rows,
            before,
          );
          assert.equal(
            (await fresh.query('SELECT count(*)::int AS n FROM "Citizen"')).rows[0].n,
            0,
          );
          assert.equal(
            (
              await fresh.query(
                'SELECT count(*)::int AS n FROM "AdministrativeAuditLog" WHERE action=\'staff.bootstrap\'',
              )
            ).rows[0].n,
            1,
          );
        } finally {
          assert.ok(directory.startsWith(join(tmpdir(), 'ev-root-integration-')));
          rmSync(directory, { recursive: true, force: true });
        }
      } finally {
        await fresh.end();
      }
    },
  );
  console.log(JSON.stringify({ result: 'passed', database: 'isolated', checks: checks.length }));
} finally {
  await runtime?.end();
  await db.$disconnect();
  await sql.end();
  for (const name of [databaseName, freshName])
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch(() => {});
  for (const role of Object.values(roles))
    await admin.query(`DROP ROLE IF EXISTS "${role}"`).catch(() => {});
  await admin.end();
}
