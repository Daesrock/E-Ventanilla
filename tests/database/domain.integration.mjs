// Solo utiliza PostgreSQL local. Cada ejecución crea y elimina su propia base.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/api/package.json', root));
const { Client } = require('pg');
const variables = parseEnv(readFileSync(new URL('apps/api/.env', root), 'utf8'));
const original = new URL(variables.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(original.hostname) && original.port === '55432');
const database = `ev_test_${randomUUID().replaceAll('-', '')}`;
const admin = new Client({ connectionString: new URL('postgres', original).href });
const url = new URL(database, original).href;
const db = new Client({ connectionString: url });
const report = { database: 'isolated-local', checks: [], tables: [] };
const checks = async (name, action) => {
  await action();
  report.checks.push(name);
  console.log(`OK ${name}`);
};
const id = () => randomUUID();
async function insert(table, data) {
  const columns = Object.keys(data);
  await db.query(`INSERT INTO "${table}" (${columns.map(key => `"${key}"`).join(',')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(',')})`, Object.values(data));
}
async function rejects(sql, parameters, code = '23503') {
  await assert.rejects(db.query(sql, parameters), error => error.code === code || (code === '23503' && error.code === '23001'));
}
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  await db.connect();
  const migrations = ['202610070001_accounts', '202610070002_mail_outbox', '202610080001_municipality_code'];
  for (const migration of migrations) await db.query(readFileSync(new URL(`database/prisma/migrations/${migration}/migration.sql`, root), 'utf8'));
  const userId = id();
  const municipality = JSON.parse(readFileSync(new URL('apps/api/resources/municipalities.json', root))).municipalities[0];
  await insert('User', { id: userId, firstName: 'Fixture aislado', lastName: 'Prueba técnica', curp: 'AAAA000101HCSBBB09', email: 'fixture@example.invalid', passwordHash: 'unchanged-technical-hash', municipality: municipality.name, updatedAt: new Date() });
  const complete = readFileSync(new URL('database/prisma/migrations/202610110001_complete_domain/migration.sql', root), 'utf8');
  await checks('preflight inválido revierte toda la migración', async () => {
    await db.query('UPDATE "User" SET municipality=$1', ['municipio incompatible']);
    await assert.rejects(db.query(complete), /municipio/);
    await db.query('ROLLBACK');
    assert.equal((await db.query(`SELECT to_regclass('public."Citizen"') AS table_name`)).rows[0].table_name, null);
    await db.query('UPDATE "User" SET municipality=$1', [municipality.name]);
  });
  await db.query(complete);
  await checks('23 tablas y actualización sin cambiar identidad ni hash', async () => {
    report.tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename);
    assert.equal(report.tables.length, 23);
    const result = (await db.query('SELECT u."passwordHash", c."userId", m.code FROM "User" u JOIN "Citizen" c ON c."userId"=u.id JOIN "Municipality" m ON m.id=c."municipalityId"')).rows[0];
    assert.equal(result.userId, userId);
    assert.equal(result.passwordHash, 'unchanged-technical-hash');
    assert.equal(result.code, municipality.code);
    assert.equal((await db.query('SELECT count(*)::int AS total FROM "Municipality"')).rows[0].total, JSON.parse(readFileSync(new URL('apps/api/resources/municipalities.json', root))).municipalities.length);
  });
  const municipalityId = (await db.query('SELECT id FROM "Municipality" WHERE code=$1', [municipality.code])).rows[0].id;
  const staffId = id();
  const citizenRole = (await db.query('SELECT id FROM "Role" WHERE code=$1', ['CITIZEN'])).rows[0].id;
  await insert('User', { id: staffId, firstName: 'Personal aislado', lastName: 'Fixture', curp: 'BABB000101HCSBBB09', email: 'staff@example.invalid', passwordHash: 'fixture', municipality: municipality.name, roleId: citizenRole, updatedAt: new Date() });
  await insert('AdministrativeStaff', { userId: staffId, street: 'Fixture', exteriorNumber: '1', neighborhood: 'Fixture', postalCode: '00000', socialSecurityNumber: '00000000001' });
  for (const profile of ['CounterStaff', 'CounterHead', 'DepartmentHead']) await insert(profile, { userId: staffId });
  const branchA = id();
  const branchB = id();
  for (const branch of [branchA, branchB]) await insert('Branch', { id: branch, municipalityId, counterHeadId: staffId, name: 'Fixture aislado', type: 'Fixture', street: 'Fixture', exteriorNumber: '1', neighborhood: 'Fixture', postalCode: '00000', updatedAt: new Date() });
  const counterA = id();
  const counterB = id();
  await insert('ServiceCounter', { id: counterA, branchId: branchA, number: 1 });
  await insert('ServiceCounter', { id: counterB, branchId: branchB, number: 1 });
  const procedureId = id();
  await insert('Procedure', { id: procedureId, name: 'Fixture', category: 'Fixture', requirements: 'Fixture', updatedAt: new Date() });
  await insert('BranchProcedure', { branchId: branchA, procedureId });
  const slotA = id();
  const slotB = id();
  for (const [slot, branch] of [[slotA, branchA], [slotB, branchB]]) await insert('TimeSlot', { id: slot, branchId: branch, date: '2099-01-01', startsAt: '09:00', endsAt: '10:00', capacity: 1 });
  const appointment = (slotId = slotA, branchId = branchA, counterId = counterA) => ({ id: id(), folio: id(), citizenId: userId, branchId, procedureId, slotId, counterId, scheduledAt: '2099-01-01T09:00:00Z', status: 'ISOLATED_FIXTURE', qrToken: id(), updatedAt: new Date() });
  await checks('rechazo de relaciones entre sedes y oferta inexistente', async () => {
    await assert.rejects(insert('Appointment', appointment(slotB)), error => error.code === '23503');
    await assert.rejects(insert('Appointment', appointment(slotA, branchA, counterB)), error => error.code === '23503');
    await assert.rejects(insert('Appointment', appointment(slotB, branchB, counterB)), error => error.code === '23503');
    assert.equal((await db.query('SELECT occupied FROM "TimeSlot" WHERE id=$1', [slotA])).rows[0].occupied, 0);
  });
  const reservation = appointment();
  await checks('capacidad concurrente: una sola reserva de dos intentos', async () => {
    const clientA = new Client({ connectionString: url });
    const clientB = new Client({ connectionString: url });
    await Promise.all([clientA.connect(), clientB.connect()]);
    const columns = Object.keys(reservation);
    const query = `INSERT INTO "Appointment" (${columns.map(key => `"${key}"`).join(',')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(',')})`;
    const other = appointment();
    const results = await Promise.allSettled([clientA.query(query, Object.values(reservation)), clientB.query(query, Object.values(other))]);
    await Promise.all([clientA.end(), clientB.end()]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === '23514').length, 1);
  });
  const appointmentId = (await db.query('SELECT id FROM "Appointment"')).rows[0].id;
  await checks('contador protegido, límite y borrados históricos restringidos', async () => {
    await rejects('UPDATE "TimeSlot" SET occupied=0 WHERE id=$1', [slotA], '23514');
    await rejects('UPDATE "TimeSlot" SET capacity=0 WHERE id=$1', [slotA], '23514');
    await rejects('DELETE FROM "Citizen" WHERE "userId"=$1', [userId]);
    await rejects('DELETE FROM "Branch" WHERE id=$1', [branchA]);
    await rejects('DELETE FROM "User" WHERE id=$1', [userId]);
  });
  await checks('CRUD de atención, registro, asignación, permiso y notificación', async () => {
    await insert('StaffAssignment', { id: id(), staffId, counterId: counterA, startsAt: new Date() });
    const attendanceId = id();
    await insert('Attendance', { id: attendanceId, appointmentId, branchId: branchA, staffId, counterId: counterA, arrivedAt: new Date(), late: false });
    await assert.rejects(insert('Attendance', { id: id(), appointmentId, branchId: branchA, staffId, counterId: counterB, arrivedAt: new Date(), late: false }));
    await insert('ProcedureRecord', { id: id(), attendanceId, finalStatus: 'ISOLATED_FIXTURE' });
    await assert.rejects(insert('ProcedureRecord', { id: id(), attendanceId, finalStatus: 'ISOLATED_FIXTURE' }), error => error.code === '23505');
    const notificationId = id();
    await insert('Notification', { id: notificationId, appointmentId, type: 'Fixture', channel: 'Fixture', status: 'Fixture' });
    await db.query('UPDATE "Notification" SET status=$1 WHERE id=$2', ['UpdatedFixture', notificationId]);
    assert.equal((await db.query('SELECT status FROM "Notification" WHERE id=$1', [notificationId])).rows[0].status, 'UpdatedFixture');
    await db.query('DELETE FROM "Notification" WHERE id=$1', [notificationId]);
    const permissionId = id();
    await insert('Permission', { id: permissionId, code: 'ISOLATED_TEST', description: 'Fixture' });
    await insert('RolePermission', { roleId: citizenRole, permissionId });
    await rejects('DELETE FROM "Permission" WHERE id=$1', [permissionId]);
  });
  await checks('reversión de reserva y liberación explícita de cupo', async () => {
    await db.query('BEGIN');
    await db.query('UPDATE "Appointment" SET "occupiesCapacity"=false WHERE id=$1', [appointmentId]);
    assert.equal((await db.query('SELECT occupied FROM "TimeSlot" WHERE id=$1', [slotA])).rows[0].occupied, 0);
    await db.query('ROLLBACK');
    assert.equal((await db.query('SELECT occupied FROM "TimeSlot" WHERE id=$1', [slotA])).rows[0].occupied, 1);
    await db.query('UPDATE "Appointment" SET "occupiesCapacity"=false WHERE id=$1', [appointmentId]);
  });
  report.result = 'passed';
  mkdirSync(new URL('.tools/test-results/', root), { recursive: true });
  writeFileSync(new URL('.tools/test-results/database-tests.json', root), JSON.stringify(report, null, 2));
} finally {
  await db.end().catch(() => {});
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => {});
  await admin.end();
}
