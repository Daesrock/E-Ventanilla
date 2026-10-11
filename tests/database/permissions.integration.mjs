import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { randomUUID, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const { Client } = createRequire(new URL('apps/api/package.json', root))('pg');
const original = new URL(parseEnv(readFileSync(new URL('apps/api/.env', root), 'utf8')).DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(original.hostname) && original.port === '55432');
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `ev_permissions_${suffix}`;
const names = Object.fromEntries(['migrator', 'manager', 'api', 'backup'].map(name => [name, `ev_test_${name}_${suffix}`]));
const password = randomBytes(32).toString('hex');
const connection = (name, db = database) => {
  const url = new URL(db, original);
  if (name) { url.username = names[name]; url.password = password; }
  return new Client({ connectionString: url.href });
};
const admin = connection(null, 'postgres');
const db = connection(null);
const clients = [];
const checks = [];
const sqlFile = name => readFileSync(new URL(name, root), 'utf8');
const rename = sql => Object.entries(names).reduce((value, [name, replacement]) => value.replaceAll(`eventanilla_${name}`, replacement), sql);
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  await db.connect();
  for (const name of Object.values(names)) await admin.query(`CREATE ROLE "${name}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password}'`);
  await db.query(`REVOKE ALL ON DATABASE "${database}" FROM PUBLIC; GRANT CONNECT ON DATABASE "${database}" TO "${names.migrator}", "${names.api}", "${names.backup}"; GRANT CREATE ON DATABASE "${database}" TO "${names.migrator}"; REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO "${names.migrator}"`);
  const managerSql = rename(sqlFile('database/postgres/manager.sql').slice(sqlFile('database/postgres/manager.sql').indexOf('ALTER ROLE')))
    .replaceAll(":'manager_password'", `'${password}'`).replace('ON DATABASE eventanilla', `ON DATABASE "${database}"`);
  await db.query(managerSql);
  await db.query(`SET ROLE "${names.migrator}"`);
  for (const name of ['202610070001_accounts', '202610070002_mail_outbox', '202610080001_municipality_code', '202610110001_complete_domain']) {
    await db.query(sqlFile(`database/prisma/migrations/${name}/migration.sql`));
  }
  await db.query('CREATE TABLE _prisma_migrations (id text PRIMARY KEY)');
  await db.query(rename(sqlFile('database/permissions/runtime.sql')));
  await db.query('RESET ROLE');
  const manager = connection('manager');
  const api = connection('api');
  const backup = connection('backup');
  clients.push(manager, api, backup);
  await Promise.all(clients.map(client => client.connect()));
  await manager.query('ALTER TABLE "User" ADD COLUMN "isolatedColumn" text; ALTER TABLE "User" DROP COLUMN "isolatedColumn"');
  await assert.rejects(api.query('CREATE TABLE forbidden (id int)'), error => error.code === '42501');
  await assert.rejects(api.query('SELECT * FROM _prisma_migrations'), error => error.code === '42501');
  await assert.rejects(api.query('UPDATE "Role" SET active=false'), error => error.code === '42501');
  await assert.rejects(manager.query(`CREATE ROLE forbidden_${suffix}`), error => error.code === '42501');
  checks.push('manager puede modificar estructura; API no crea tablas ni cambia roles; manager no administra roles del clúster');
  for (const creator of ['manager', 'migrator']) {
    const table = `future_${creator}`;
    if (creator === 'manager') await manager.query(`CREATE TABLE "${table}" (id int PRIMARY KEY)`);
    else await db.query(`SET ROLE "${names.migrator}"; CREATE TABLE "${table}" (id int PRIMARY KEY); RESET ROLE`);
    await api.query(`INSERT INTO "${table}" VALUES (1); UPDATE "${table}" SET id=2`);
    assert.equal((await backup.query(`SELECT count(*)::int AS total FROM "${table}"`)).rows[0].total, 1);
    await assert.rejects(backup.query(`DELETE FROM "${table}"`), error => error.code === '42501');
    await api.query(`DELETE FROM "${table}"`);
    await db.query(`DROP TABLE "${table}"`);
  }
  checks.push('permisos de tablas futuras para ambos propietarios; respaldo puede leer y no escribir');
  const role = (await manager.query('SELECT id FROM "Role" LIMIT 1')).rows[0].id;
  const fixtureId = randomUUID();
  await manager.query('INSERT INTO "User" (id,"firstName","lastName",curp,email,"passwordHash",municipality,"roleId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())', [fixtureId, 'Fixture', 'Aislado', 'AAAA000101HCSBBB09', 'fixture@example.invalid', 'technical-fixture', 'Fixture', role]);
  await manager.query('UPDATE "User" SET active=false WHERE id=$1', [fixtureId]);
  assert.equal((await manager.query('SELECT active FROM "User" WHERE id=$1', [fixtureId])).rows[0].active, false);
  await manager.query('DELETE FROM "User" WHERE id=$1', [fixtureId]);
  checks.push('manager puede insertar, consultar, actualizar y borrar datos propios del proyecto');
  await db.query(rename(sqlFile('database/postgres/check-permissions.sql').replace(/^\\set .*$/gm, '')));
  mkdirSync(new URL('.tools/test-results/', root), { recursive: true });
  writeFileSync(new URL('.tools/test-results/permissions-tests.json', root), JSON.stringify({ result: 'passed', database: 'isolated-local', checks }, null, 2));
  checks.forEach(check => console.log(`OK ${check}`));
} finally {
  await Promise.all(clients.map(client => client.end().catch(() => {})));
  await db.end().catch(() => {});
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => {});
  for (const name of Object.values(names).reverse()) await admin.query(`DROP ROLE IF EXISTS "${name}"`).catch(() => {});
  await admin.end();
}
