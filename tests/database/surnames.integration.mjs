// Actualización de una cuenta anterior y edición desde SQL, únicamente en una base aislada.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const { Client } = createRequire(new URL('apps/api/package.json', root))('pg');
const original = new URL(parseEnv(readFileSync(new URL('apps/api/.env', root), 'utf8')).DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(original.hostname) && original.port === '55432');
const database = `ev_surnames_${randomUUID().replaceAll('-', '')}`;
const admin = new Client({ connectionString: new URL('postgres', original).href });
const db = new Client({ connectionString: new URL(database, original).href });
const directory = new URL('database/prisma/migrations/', root);
const latest = '202610110002_separate_surnames';
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  await db.connect();
  for (const migration of readdirSync(directory).filter(name => name !== latest && name !== 'migration_lock.toml').sort()) {
    await db.query(readFileSync(new URL(`${migration}/migration.sql`, directory), 'utf8'));
  }
  const id = randomUUID();
  await db.query(`INSERT INTO "User" (id,"firstName","lastName",curp,email,"passwordHash",municipality,"roleId","updatedAt")
    SELECT $1,'Fixture','De la Cruz Del Río','AAAA000101HCSBBB09','fixture@example.invalid','unchanged-fixture',m.name,r.id,now()
    FROM "Municipality" m CROSS JOIN "Role" r WHERE r.code='CITIZEN' LIMIT 1`, [id]);
  const before = (await db.query('SELECT "lastName", "passwordHash" FROM "User" WHERE id=$1', [id])).rows[0];
  await db.query(readFileSync(new URL(`${latest}/migration.sql`, directory), 'utf8'));
  const current = (await db.query('SELECT "lastName","passwordHash","paternalLastName","maternalLastName" FROM "User" WHERE id=$1', [id])).rows[0];
  assert.equal(current.lastName, before.lastName);
  assert.equal(current.passwordHash, before.passwordHash);
  assert.equal(current.paternalLastName, null);
  assert.equal(current.maternalLastName, null);
  await assert.rejects(db.query('UPDATE "User" SET "maternalLastName"=$1 WHERE id=$2', ['Sin paterno', id]), error => error.code === '23514');
  await db.query('UPDATE "User" SET "paternalLastName"=$1,"maternalLastName"=$2 WHERE id=$3', ['De la Cruz', 'Del Río', id]);
  assert.equal((await db.query('SELECT "lastName" FROM "User" WHERE id=$1', [id])).rows[0].lastName, before.lastName);
  await db.query('UPDATE "User" SET "maternalLastName"=NULL WHERE id=$1', [id]);
  assert.equal((await db.query('SELECT "lastName" FROM "User" WHERE id=$1', [id])).rows[0].lastName, 'De la Cruz');
  await assert.rejects(db.query('UPDATE "User" SET "paternalLastName"=$1 WHERE id=$2', [' ', id]), error => error.code === '23514');
  await db.query('UPDATE "User" SET "paternalLastName"=$1,"maternalLastName"=$2 WHERE id=$3', ['Á'.repeat(100), 'Ñ'.repeat(100), id]);
  assert.equal((await db.query('SELECT char_length("lastName") AS length FROM "User" WHERE id=$1', [id])).rows[0].length, 201);
  const report = { result: 'passed', database: 'isolated-local', existingSurnamesAndHashesPreserved: true, missingPartsRemainNull: true, directSqlSynchronizesCompatibilityName: true, separateSurnamesConstraints: true };
  mkdirSync(new URL('.tools/test-results/', root), { recursive: true });
  writeFileSync(new URL('.tools/test-results/surnames-migration-tests.json', root), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await db.end().catch(() => {});
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`).catch(() => {});
  await admin.end();
}
