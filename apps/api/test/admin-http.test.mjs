import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminModule } from '../dist/features/admin/admin.module.js';
import { DatabaseService } from '../dist/core/persistence/database.service.js';
import { PublicCatalogController } from '../dist/features/catalog/public-catalog.controller.js';
import { PublicCatalogService } from '../dist/features/catalog/public-catalog.service.js';
import { validationFailure } from '../dist/core/validation/validation.js';
import { dateOnlyToDate } from '../dist/features/admin/admin.time.js';
import { ReportsAdminService, csvCell } from '../dist/features/admin/reports.admin.service.js';

const contract = JSON.parse(
  readFileSync(new URL('../../../contracts/admin-api.endpoints.json', import.meta.url)),
);
const branchId = randomUUID();
const token = 'a'.repeat(43);
const permissionCodes = [
  ...new Set(contract.endpoints.map((e) => e.permission).filter((p) => p && p !== 'public')),
];

async function withApi(run) {
  // Dobles en memoria: no se conectan a PostgreSQL ni usan identidades reales.
  const identity = {
    id: randomUUID(),
    firstName: 'Fixture',
    lastName: 'Aislado',
    paternalLastName: 'Aislado',
    maternalLastName: null,
    email: 'fixture@example.invalid',
    emailVerifiedAt: new Date(),
    active: true,
    role: {
      code: 'ROOT',
      name: 'ROOT',
      hierarchyLevel: 100,
      active: true,
      permissions: permissionCodes.map((code) => ({ permission: { code } })),
    },
    administrativeStaff: { counterStaff: null, counterHead: null, departmentHead: null },
  };
  let branchQuery;
  let procedureQuery;
  let writes = 0;
  const db = {
    session: {
      findUnique: async () => ({ user: identity, expiresAt: new Date(Date.now() + 60000) }),
    },
    user: {
      findUniqueOrThrow: async () => identity,
      findMany: async () => [],
      count: async () => 0,
    },
    branch: {
      findMany: async (args) => {
        branchQuery = args;
        return [];
      },
      findUnique: async () => ({ id: branchId }),
      findFirst: async () => ({ id: branchId }),
    },
    procedure: {
      findMany: async (args) => {
        procedureQuery = args;
        return [];
      },
    },
    $transaction: async () => {
      writes++;
      throw new Error('No se esperaba una escritura.');
    },
  };
  class TestModule {}
  // Todos los controladores y proveedores son reales; solo se reemplaza la persistencia.
  Module({
    controllers: [...Reflect.getMetadata('controllers', AdminModule), PublicCatalogController],
    providers: [
      ...Reflect.getMetadata('providers', AdminModule),
      PublicCatalogService,
      { provide: DatabaseService, useValue: db },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationFailure,
    }),
  );
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const request = (path, options = {}) =>
    fetch(base + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  try {
    await run({
      identity,
      request,
      db,
      get branchQuery() {
        return branchQuery;
      },
      get procedureQuery() {
        return procedureQuery;
      },
      get writes() {
        return writes;
      },
    });
  } finally {
    await app.close();
  }
}

test('HTTP administrativo: todas las rutas del contrato existen y exigen sesión', async () => {
  await withApi(async ({ request }) => {
    for (const endpoint of contract.endpoints.filter((e) => e.permission !== 'public')) {
      const path = endpoint.path.replaceAll(/\{[^}]+\}/g, branchId);
      const response = await request(path, {
        method: endpoint.method,
        headers: { Authorization: '' },
      });
      assert.equal(response.status, 401, `${endpoint.method} ${path}`);
    }
  });
});

test('HTTP administrativo: inyección real, identidad segura y rechazo de ciudadanos o rol inactivo', async () => {
  await withApi(async ({ request, identity }) => {
    const result = await request('/v1/admin/me');
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.equal(body.role.code, 'ROOT');
    assert.equal(body.scope.allBranches, true);
    assert.deepEqual(body.permissions, permissionCodes.sort());
    assert.equal('passwordHash' in body.user, false);
    identity.role.code = 'CITIZEN';
    assert.equal((await (await request('/v1/admin/me')).json()).code, 'ADMIN_ACCESS_REQUIRED');
    identity.role.code = 'ROOT';
    identity.role.active = false;
    assert.equal((await request('/v1/admin/me')).status, 403);
  });
});

test('HTTP administrativo: permisos y roles se comprueban aunque el cliente se atribuya acceso total', async () => {
  await withApi(async ({ request, identity }) => {
    identity.role.permissions = [];
    const denied = await request('/v1/admin/procedures');
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'ADMIN_PERMISSION_REQUIRED');
    identity.role.permissions = permissionCodes.map((code) => ({ permission: { code } }));
    identity.role.code = 'COUNTER_HEAD';
    for (const path of ['/v1/admin/staff', '/v1/admin/branches', '/v1/admin/procedures'])
      assert.equal((await request(path, { method: 'POST', body: '{}' })).status, 403, path);
  });
});

test('HTTP administrativo: una sede ajena no se consulta ni se modifica', async () => {
  await withApi(async (api) => {
    api.identity.role.code = 'COUNTER_HEAD';
    const response = await api.request(`/v1/admin/branches/${branchId}/time-slots`);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'BRANCH_OUT_OF_SCOPE');
    assert.equal((await api.request('/v1/admin/branches')).status, 200);
    assert.deepEqual(api.branchQuery.where.id, { in: [] });
    const report = await api.request(
      `/v1/admin/reports?from=2026-10-01&to=2026-10-31&branchId=${branchId}`,
    );
    assert.equal(report.status, 403);
    assert.equal(api.writes, 0);
  });
});

test('HTTP administrativo: fechas imposibles, nulos y campos protegidos fallan por campo antes de escribir', async () => {
  await withApi(async (api) => {
    for (const [method, path, body, field] of [
      [
        'POST',
        `/v1/admin/branches/${branchId}/time-slots`,
        { date: '2026-02-31', startsAt: '09:00', endsAt: '10:00', capacity: 1 },
        'date',
      ],
      ['PATCH', `/v1/admin/time-slots/${branchId}`, { occupied: 1 }, 'occupied'],
      ['PATCH', `/v1/admin/time-slots/${branchId}`, { capacity: null }, 'capacity'],
      ['PATCH', `/v1/admin/branches/${branchId}`, { name: null }, 'name'],
      ['PATCH', `/v1/admin/branches/${branchId}`, { active: null }, 'active'],
      ['POST', '/v1/admin/staff', { role: 'ROOT' }, 'role'],
      ['PATCH', `/v1/admin/staff/${branchId}`, { phone: '123abc' }, 'phone'],
    ]) {
      const response = await api.request(path, { method, body: JSON.stringify(body) });
      assert.equal(response.status, 400, `${path}: ${JSON.stringify(body)}`);
      const error = await response.json();
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.ok(error.fieldErrors[field], field);
    }
    assert.equal(api.writes, 0);
  });
});

test('catálogo público por sede: solo oferta activa y trámites publicados, sin exigir sesión', async () => {
  await withApi(async (api) => {
    const response = await api.request(`/v1/catalog/branches/${branchId}/procedures`, {
      headers: { Authorization: '' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [] });
    assert.deepEqual(api.procedureQuery.where, {
      active: true,
      published: true,
      branches: { some: { branchId, active: true } },
    });
  });
});

test('reportes: rechaza columnas del prototipo y neutraliza fórmulas con espacios iniciales', async () => {
  const service = new ReportsAdminService({});
  for (const columns of ['toString', '__proto__', 'constructor'])
    await assert.rejects(
      service.exportCsv({ allBranches: true }, { from: '2026-10-01', to: '2026-10-02', columns }),
      (error) => !!error.getResponse().fieldErrors.columns,
    );
  assert.equal(csvCell('   =SUM(A1)'), "'   =SUM(A1)");
  assert.throws(() => dateOnlyToDate('2026-02-31'));
});
