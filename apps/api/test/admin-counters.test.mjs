/** Consulta de mostradores: protege el alcance y devuelve únicamente referencias operativas. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BranchesAdminService } from '../dist/features/admin/branches.admin.service.js';

test('mostradores de sede ajena se rechazan antes de consultar la base', async () => {
  const service = new BranchesAdminService({});
  await assert.rejects(
    () => service.countersFor({ allBranches: false, branchIds: ['own'] }, 'other'),
    (error) => error.getStatus() === 403,
  );
});
test('mostradores: sede inexistente 404 y consulta válida filtra por sede', async () => {
  let where;
  const db = {
    branch: { findUnique: async () => ({ id: 'own' }) },
    serviceCounter: {
      findMany: async (args) => {
        where = args.where;
        return [{ id: 'counter', number: 1, active: true }];
      },
    },
  };
  const service = new BranchesAdminService(db);
  assert.deepEqual(await service.countersFor({ allBranches: false, branchIds: ['own'] }, 'own'), {
    items: [{ id: 'counter', number: 1, active: true }],
  });
  assert.deepEqual(where, { branchId: 'own' });
  db.branch.findUnique = async () => null;
  await assert.rejects(
    () => service.countersFor({ allBranches: true, branchIds: [] }, 'missing'),
    (error) => error.getStatus() === 404,
  );
});
