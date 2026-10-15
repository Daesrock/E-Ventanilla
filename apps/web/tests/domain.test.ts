/** Pruebas de reglas críticas: alcance por sede, asociaciones históricas, cupos y métricas. */
import { describe, expect, it } from 'vitest';
import { createSeed } from '../src/mocks/seed';
import { applyCommand } from '../src/mocks/commands';
import { scopedBranches } from '../src/features/auth/policy';
import {
  calculateMetrics,
  filterAppointments,
  monthRange,
} from '../src/features/reports/report.service';
import { csvCell } from '../src/utils/format';

const fresh = () => createSeed(new Date('2026-10-12T12:00:00-06:00'));
const filters = {
  from: '2026-10-01',
  to: '2026-10-31',
  municipality: '',
  branchType: '',
  branchId: '',
  procedureId: '',
  status: '',
};

describe('alcance demostrativo', () => {
  it('un jefe de ventanilla no consulta ni cambia otra sede, incluso por ID directo', () => {
    const db = fresh();
    const head = db.users.find((user) => user.id === 'demo-counter')!;
    expect(scopedBranches(db.branches, head).map((branch) => branch.id)).toEqual([
      'tuxtla-vuge',
      'tuxtla-vim',
    ]);
    const foreign = db.slots.find((slot) => slot.branchId === 'tapachula-vuge')!;
    expect(() =>
      applyCommand(db, head, { type: 'save-slot', slot: { ...foreign, capacity: 50 } }),
    ).toThrow('No tienes acceso');
    expect(
      filterAppointments(db.appointments, scopedBranches(db.branches, head), filters).every(
        (appointment) => appointment.branchId.startsWith('tuxtla'),
      ),
    ).toBe(true);
  });
  it('solo root crea cuentas y una cuenta inactiva pierde su alcance', () => {
    const db = fresh();
    const department = db.users.find((user) => user.role === 'DEPARTMENT_HEAD')!;
    expect(() =>
      applyCommand(db, department, {
        type: 'save-user',
        user: {
          id: 'new',
          name: 'Ejemplo',
          email: 'ejemplo@ejemplo.invalid',
          role: 'COUNTER_HEAD',
          active: true,
        },
      }),
    ).toThrow('Solo root');
    expect(scopedBranches(db.branches, { ...department, active: false })).toEqual([]);
  });
  it('no permite editar rol de root ni cambiar asignación desde jefe de ventanilla', () => {
    const db = fresh();
    const root = db.users.find((user) => user.role === 'ROOT')!;
    const head = db.users.find((user) => user.id === 'demo-counter')!;
    expect(() =>
      applyCommand(db, root, { type: 'save-user', user: { ...root, role: 'COUNTER_HEAD' } }),
    ).toThrow('No se puede cambiar el rol');
    expect(() =>
      applyCommand(db, head, {
        type: 'save-branch',
        branch: { ...db.branches[0], counterHeadId: 'head-tapachula' },
      }),
    ).toThrow('Solo puedes actualizar');
  });
});

describe('consistencia de configuración', () => {
  it('retira un trámite de la oferta sin eliminar asociación ni citas históricas', () => {
    const db = fresh();
    const actor = db.users.find((user) => user.role === 'DEPARTMENT_HEAD')!;
    const next = applyCommand(db, actor, {
      type: 'set-offer',
      branchId: db.branches[0].id,
      procedureIds: [],
    });
    expect(
      next.branchProcedures.filter((link) => link.branchId === db.branches[0].id).length,
    ).toBeGreaterThan(0);
    expect(
      next.branchProcedures
        .filter((link) => link.branchId === db.branches[0].id)
        .every((link) => !link.active),
    ).toBe(true);
    expect(next.appointments).toEqual(db.appointments);
    expect(db.branchProcedures.every((link) => link.active)).toBe(true);
  });
  it('rechaza capacidad menor que ocupación y bloques superpuestos', () => {
    const db = fresh();
    const actor = db.users.find((user) => user.role === 'ROOT')!;
    const slot = db.slots[0];
    expect(() =>
      applyCommand(db, actor, {
        type: 'save-slot',
        slot: { ...slot, capacity: slot.occupied - 1 },
      }),
    ).toThrow('capacidad');
    expect(() =>
      applyCommand(db, actor, {
        type: 'save-slot',
        slot: { ...slot, id: 'overlap', startsAt: '10:00', occupied: 0 },
      }),
    ).toThrow('superpone');
  });
});

describe('reportes y exportación', () => {
  it('cuenta personas distintas y excluye tiempos incompletos y negativos', () => {
    const base = fresh().appointments[1];
    const rows = [
      {
        ...base,
        id: 'one',
        citizenId: 'same',
        arrivedAt: '2026-10-01T09:00:00-06:00',
        startedAt: '2026-10-01T09:10:00-06:00',
        endedAt: '2026-10-01T09:40:00-06:00',
      },
      {
        ...base,
        id: 'two',
        citizenId: 'same',
        arrivedAt: '2026-10-01T09:10:00-06:00',
        startedAt: '2026-10-01T09:00:00-06:00',
        endedAt: null,
      },
    ];
    expect(calculateMetrics(rows)).toMatchObject({
      appointments: 2,
      citizens: 1,
      arrivals: 2,
      completed: 1,
      meanWaitMinutes: 10,
      meanAttentionMinutes: 30,
    });
    expect(calculateMetrics([]).meanWaitMinutes).toBeNull();
  });
  it('usa fecha civil de Chiapas al cruzar medianoche UTC y año bisiesto', () => {
    const db = fresh();
    const boundary = { ...db.appointments[0], scheduledAt: '2026-11-01T03:00:00Z' };
    expect(filterAppointments([boundary], db.branches, filters)).toHaveLength(1);
    expect(
      filterAppointments([boundary], db.branches, {
        ...filters,
        from: '2026-11-01',
        to: '2026-11-30',
      }),
    ).toHaveLength(0);
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
  it('escapa comillas y neutraliza fórmulas al exportar CSV', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(csvCell('Nombre "de ejemplo"')).toBe('"Nombre ""de ejemplo"""');
  });
});
