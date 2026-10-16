import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService, assertBranchScope } from '../dist/features/admin/admin.auth.js';
import { AdminGuard } from '../dist/features/admin/admin.guard.js';
import { SlotsAdminService } from '../dist/features/admin/slots.admin.service.js';
import { ProceduresAdminService } from '../dist/features/admin/procedures.admin.service.js';
import { PublicCatalogService } from '../dist/features/catalog/public-catalog.service.js';
import {
  summarize,
  buildCsv,
  csvCell,
  REPORT_COLUMNS,
} from '../dist/features/admin/reports.admin.service.js';
import { assertPublicationSource } from '../dist/features/admin/admin.publication.js';
import {
  rangesOverlap,
  timeToMinutes,
  minutesToTime,
  timeToDate,
  dateToTime,
  assertDateRange,
  mexicoStamp,
} from '../dist/features/admin/admin.time.js';
import {
  optionalDate,
  optionalUuid,
  optionalFlag,
  pageParams,
} from '../dist/features/admin/admin.shared.js';

const token = 'a'.repeat(43);

/** Los errores de campo exponen detalles en `fieldErrors`, no en el mensaje raíz. */
function fieldErrors(error) {
  const response = typeof error?.getResponse === 'function' ? error.getResponse() : undefined;
  return response?.fieldErrors ?? {};
}

function adminFixture(roleCode, { permissions = [], branches = [], profiles = {} } = {}) {
  const user = {
    id: randomUUID(),
    firstName: 'Ana',
    lastName: 'López Ruiz',
    paternalLastName: 'López',
    maternalLastName: 'Ruiz',
    email: 'ana@example.org',
    emailVerifiedAt: new Date(),
    active: true,
    role: {
      code: roleCode,
      name: roleCode,
      hierarchyLevel: roleCode === 'ROOT' ? 100 : 50,
      active: true,
      permissions: permissions.map((code) => ({ permission: { code } })),
    },
    administrativeStaff: {
      counterStaff: profiles.counterStaff ? { userId: 'x' } : null,
      counterHead: profiles.counterHead ? { userId: 'x' } : null,
      departmentHead: profiles.departmentHead ? { userId: 'x' } : null,
    },
  };
  const db = {
    session: {
      findUnique: async () => ({
        user: { id: user.id, active: true, emailVerifiedAt: new Date() },
        expiresAt: new Date(Date.now() + 60000),
      }),
    },
    user: { findUniqueOrThrow: async () => user },
    branch: { findMany: async () => branches },
  };
  return { db, user };
}

function contextMock(request) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

test('el guard administrativo rechaza a una cuenta ciudadana', async () => {
  const { db } = adminFixture('CITIZEN');
  const service = new AdminAuthService(db);
  await assert.rejects(
    () => service.authenticate(token),
    (error) => error instanceof ForbiddenException,
  );
});

test('el guard administrativo exige sesión Bearer', async () => {
  const { db } = adminFixture('ROOT', { permissions: ['branch.read'] });
  const guard = new AdminGuard(new AdminAuthService(db), { getAllAndOverride: () => [] });
  const request = { headers: {} };
  await assert.rejects(
    () => guard.canActivate(contextMock(request)),
    (error) => error instanceof UnauthorizedException,
  );
});

test('un permiso ausente bloquea la ruta aunque el rol sea administrativo', async () => {
  const { db } = adminFixture('COUNTER_HEAD', { permissions: ['branch.read'] });
  const guard = new AdminGuard(new AdminAuthService(db), {
    getAllAndOverride: () => ['staff.create'],
  });
  const request = { headers: { authorization: `Bearer ${token}` } };
  await assert.rejects(
    () => guard.canActivate(contextMock(request)),
    (error) => error instanceof ForbiddenException,
  );
  assert.equal(request.admin, undefined);
});

test('el permiso presente deja pasar y adjunta el contexto', async () => {
  const { db, user } = adminFixture('COUNTER_HEAD', {
    permissions: ['slot.create'],
    branches: [{ id: 'sede-1' }],
    profiles: { counterHead: true },
  });
  const guard = new AdminGuard(new AdminAuthService(db), {
    getAllAndOverride: () => ['slot.create'],
  });
  const request = { headers: { authorization: `Bearer ${token}` } };
  assert.equal(await guard.canActivate(contextMock(request)), true);
  assert.equal(request.admin.userId, user.id);
  assert.deepEqual(request.admin.branchIds, ['sede-1']);
  assert.equal(request.admin.allBranches, false);
});

test('root y jefe de departamento operan sin alcance limitado', async () => {
  const root = adminFixture('ROOT');
  const context = await new AdminAuthService(root.db).authenticate(token);
  assert.equal(context.allBranches, true);
  const head = adminFixture('DEPARTMENT_HEAD');
  const headContext = await new AdminAuthService(head.db).authenticate(token);
  assert.equal(headContext.allBranches, true);
});

test('el alcance por sede rechaza sedes ajenas y permite las asignadas', () => {
  const scoped = { allBranches: false, branchIds: ['sede-1'] };
  assert.doesNotThrow(() => assertBranchScope(scoped, 'sede-1'));
  assert.throws(
    () => assertBranchScope(scoped, 'sede-2'),
    (error) => error instanceof ForbiddenException,
  );
  assert.doesNotThrow(() => assertBranchScope({ allBranches: true, branchIds: [] }, 'sede-2'));
});

test('las horas se convierten de ida y vuelta sin perder minutos', () => {
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(dateToTime(timeToDate('23:59')), '23:59');
  assert.throws(() => timeToMinutes('24:00'), (error) => !!fieldErrors(error).startsAt);
  assert.throws(() => timeToMinutes('9:30'), (error) => !!fieldErrors(error).startsAt);
});

test('la superposición de bloques respeta intervalos semiabiertos', () => {
  assert.equal(rangesOverlap(540, 660, 600, 720), true);
  assert.equal(rangesOverlap(540, 600, 600, 720), false);
  assert.equal(rangesOverlap(540, 600, 480, 540), false);
  assert.equal(rangesOverlap(540, 600, 480, 720), true);
});

test('el periodo inválido se rechaza y las marcas de Chiapas usan -06:00', () => {
  assert.throws(
    () => assertDateRange('2026-10-20', '2026-10-01'),
    (error) => /periodo/.test(fieldErrors(error).from ?? ''),
  );
  assert.equal(mexicoStamp(new Date('2026-10-15T18:00:00Z')), '2026-10-15 12:00');
});

test('los parámetros de consulta se validan con mensajes por campo', () => {
  assert.deepEqual(pageParams({}), { page: 1, pageSize: 25, skip: 0, take: 25 });
  assert.equal(pageParams({ page: '3', pageSize: '10' }).skip, 20);
  assert.throws(() => pageParams({ pageSize: '500' }), (error) => !!fieldErrors(error).pageSize);
  assert.equal(optionalFlag('true', 'active'), true);
  assert.throws(() => optionalFlag('si', 'active'), (error) => !!fieldErrors(error).active);
  assert.equal(optionalUuid(undefined, 'branchId'), undefined);
  assert.throws(() => optionalUuid('no-uuid', 'branchId'), (error) => !!fieldErrors(error).branchId);
  assert.throws(() => optionalDate('20-10-2026', 'from'), (error) => !!fieldErrors(error).from);
  assert.throws(() => optionalDate('2026-02-31', 'from'), (error) => !!fieldErrors(error).from);
});

test('la publicación exige fuente corroborada completa', () => {
  assert.throws(() => assertPublicationSource({}), (error) => !!fieldErrors(error).sourceKey);
  assert.doesNotThrow(() =>
    assertPublicationSource({
      sourceKey: 'coesa-2026-10-11',
      sourceUrl: 'https://example.org/catalogo.json',
      sourceSha256: 'a'.repeat(64),
      sourceCheckedAt: '2026-10-14T00:00:00.000Z',
    }),
  );
  assert.throws(
    () =>
      assertPublicationSource({
        sourceKey: 'x',
        sourceUrl: 'http://example.org/catalogo.json',
        sourceSha256: 'a'.repeat(64),
        sourceCheckedAt: '2026-10-14T00:00:00.000Z',
      }),
    (error) => !!fieldErrors(error).sourceUrl,
  );
});

function slotRow({
  id = randomUUID(),
  startsAt = '09:00',
  endsAt = '11:00',
  capacity = 10,
  occupied = 0,
  active = true,
} = {}) {
  return {
    id,
    branchId: 'sede-1',
    date: new Date(Date.UTC(2026, 9, 20)),
    startsAt: timeToDate(startsAt),
    endsAt: timeToDate(endsAt),
    capacity,
    occupied,
    active,
  };
}

const rootContext = {
  userId: randomUUID(),
  allBranches: true,
  branchIds: [],
  role: { code: 'ROOT' },
};

test('los horarios rechazan superposición y capacidad menor a la ocupada', async () => {
  const db = {
    branch: { findUnique: async () => ({ id: 'sede-1' }) },
    timeSlot: {
      findMany: async () => [slotRow({ occupied: 4 })],
      findUnique: async () => slotRow({ occupied: 5 }),
    },
    $transaction: async (action) => action({}),
  };
  const slots = new SlotsAdminService(db);
  await assert.rejects(
    () =>
      slots.create(rootContext, 'sede-1', {
        date: '2026-10-20',
        startsAt: '10:00',
        endsAt: '12:00',
        capacity: 5,
      }),
    (error) => /superpone/.test(fieldErrors(error).startsAt ?? ''),
  );
  await assert.rejects(
    () => slots.update(rootContext, 'slot-1', { capacity: 3 }),
    (error) => /no puede ser menor/.test(fieldErrors(error).capacity ?? ''),
  );
});

test('la ocupación jamás se edita: solo llegan horas, capacidad y vigencia', async () => {
  let captured;
  const existing = slotRow({ occupied: 5 });
  const db = {
    timeSlot: {
      findUnique: async () => existing,
      findMany: async () => [],
      update: async ({ data }) => {
        captured = data;
        return existing;
      },
    },
    $transaction: async (action) =>
      action({
        timeSlot: { update: async (args) => db.timeSlot.update(args) },
        administrativeAuditLog: { create: async () => ({}) },
      }),
  };
  const slots = new SlotsAdminService(db);
  await slots.update(rootContext, 'slot-1', { capacity: 8 });
  assert.equal('occupied' in captured, false);
  assert.equal(captured.capacity, 8);
});

test('el catálogo central no publica sin fuente y sí con fuente completa', async () => {
  const base = {
    id: randomUUID(),
    name: 'Constancia',
    category: null,
    description: null,
    requirements: null,
    cost: null,
    estimatedMinutes: null,
    active: true,
    published: false,
    sourceKey: null,
    sourceUrl: null,
    sourceSha256: null,
    sourceCheckedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const db = {
    procedure: {
      findUnique: async () => base,
      update: async ({ data }) => ({ ...base, ...data }),
    },
    $transaction: async (action) =>
      action({
        procedure: { update: async (args) => db.procedure.update(args) },
        administrativeAuditLog: { create: async () => ({}) },
      }),
  };
  const procedures = new ProceduresAdminService(db);
  await assert.rejects(
    () => procedures.update(rootContext, base.id, { published: true }),
    (error) => !!fieldErrors(error).sourceKey,
  );
  const published = await procedures.update(rootContext, base.id, {
    published: true,
    sourceKey: 'coesa',
    sourceUrl: 'https://example.org/x.json',
    sourceSha256: 'b'.repeat(64),
    sourceCheckedAt: '2026-10-14T00:00:00.000Z',
  });
  assert.equal(published.published, true);
});

test('el resumen de reportes cuenta ciudadanos únicos y promedia solo tiempos completos', () => {
  const arrived = new Date('2026-10-20T15:00:00Z');
  const started = new Date('2026-10-20T15:10:00Z');
  const ended = new Date('2026-10-20T15:40:00Z');
  const summary = summarize([
    {
      citizenId: 'c1',
      attendance: { arrivedAt: arrived, startedAt: started, endedAt: ended, late: false },
    },
    { citizenId: 'c1', attendance: { arrivedAt: arrived, startedAt: null, endedAt: null, late: true } },
    { citizenId: 'c2', attendance: null },
  ]);
  assert.equal(summary.appointments, 3);
  assert.equal(summary.citizens, 2);
  assert.equal(summary.attended, 2);
  assert.equal(summary.completed, 1);
  assert.equal(summary.late, 1);
  assert.equal(summary.averageWaitMinutes, 10);
  assert.equal(summary.averageServiceMinutes, 30);
  const empty = summarize([{ citizenId: 'c3', attendance: null }]);
  assert.equal(empty.averageWaitMinutes, null);
  assert.equal(empty.averageServiceMinutes, null);
});

test('el CSV neutraliza fórmulas, escapa comillas y respeta las columnas pedidas', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('con "comillas"'), '"con ""comillas"""');
  assert.equal(csvCell('a;b'), '"a;b"');
  const csv = buildCsv(['folio', 'late'], [
    { folio: '=PELIGRO', late: true },
    { folio: 'A-1', late: null },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], `${REPORT_COLUMNS.folio},${REPORT_COLUMNS.late}`);
  assert.equal(lines[1], "'=PELIGRO,Sí");
  assert.equal(lines[2], 'A-1,');
});

test('el catálogo público aditivo respeta sedes publicadas', async () => {
  const db = { branch: { findFirst: async () => null } };
  const catalog = new PublicCatalogService(db);
  await assert.rejects(
    () => catalog.branchProcedures(randomUUID()),
    /no está disponible/,
  );
});
