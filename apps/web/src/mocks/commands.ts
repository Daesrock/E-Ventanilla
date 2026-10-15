/**
 * Comandos del almacén local: validan alcance, referencias y campos antes de cambiar
 * datos ficticios. No ejecutan escrituras HTTP ni SQL. Mantienen historial de citas.
 */
import type {
  AppointmentStatus,
  Branch,
  DemoDatabase,
  Procedure,
  StaffUser,
  TimeSlot,
} from '../types/domain';
import {
  canAccessBranch,
  canAssignHeads,
  canCreateUsers,
  canManageCatalog,
} from '../features/auth/policy';

export type DemoCommand =
  | { type: 'save-branch'; branch: Branch }
  | { type: 'save-procedure'; procedure: Procedure }
  | { type: 'set-offer'; branchId: string; procedureIds: string[] }
  | { type: 'save-user'; user: StaffUser }
  | { type: 'save-slot'; slot: TimeSlot }
  | { type: 'appointment-status'; appointmentId: string; status: AppointmentStatus };

const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};
const replace = <T extends { id: string }>(items: T[], item: T) =>
  items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];

/** Aplica una operación de forma inmutable, con validación previa y alcance por sede. */
export function applyCommand(
  db: DemoDatabase,
  actor: StaffUser,
  command: DemoCommand,
): DemoDatabase {
  const currentActor = db.users.find((user) => user.id === actor.id);
  check(Boolean(currentActor?.active), 'Cuenta demostrativa inactiva o inexistente.');
  actor = currentActor!;
  const branchFor = (id: string) => {
    const branch = db.branches.find((item) => item.id === id);
    check(Boolean(branch && canAccessBranch(branch, actor)), 'No tienes acceso a esta sede.');
    return branch!;
  };
  switch (command.type) {
    case 'save-branch': {
      const branch = command.branch;
      const previous = db.branches.find((item) => item.id === branch.id);
      check(
        actor.role === 'ROOT' || Boolean(previous && canAccessBranch(previous, actor)),
        'Solo root puede crear sedes.',
      );
      check(
        Boolean(branch.name.trim() && branch.municipality.trim() && branch.address.trim()),
        'Completa nombre, municipio y dirección.',
      );
      check(['VUGE', 'VIM'].includes(branch.type), 'Selecciona un tipo de sede válido.');
      check(
        !branch.counterHeadId ||
          db.users.some(
            (user) =>
              user.id === branch.counterHeadId && user.role === 'COUNTER_HEAD' && user.active,
          ),
        'Selecciona un jefe de ventanilla activo.',
      );
      if (!canAssignHeads(actor)) {
        check(
          Boolean(
            previous &&
            branch.counterHeadId === previous.counterHeadId &&
            branch.active === previous.active &&
            branch.published === previous.published &&
            branch.name === previous.name &&
            branch.type === previous.type &&
            branch.municipality === previous.municipality &&
            branch.municipalityCode === previous.municipalityCode,
          ),
          'Solo puedes actualizar contacto y dirección de tu sede.',
        );
      }
      return {
        ...db,
        branches: replace(db.branches, {
          ...branch,
          name: branch.name.trim(),
          address: branch.address.trim(),
        }),
      };
    }
    case 'save-procedure': {
      const procedure = command.procedure;
      check(canManageCatalog(actor), 'No puedes modificar el catálogo central.');
      check(
        Boolean(procedure.name.trim() && procedure.requirements.trim()),
        'Completa nombre y requisitos.',
      );
      check(
        Number.isFinite(procedure.cost) && procedure.cost >= 0,
        'El costo debe ser un número no negativo.',
      );
      check(
        Number.isInteger(procedure.estimatedMinutes) && procedure.estimatedMinutes > 0,
        'La duración debe ser un entero positivo.',
      );
      return {
        ...db,
        procedures: replace(db.procedures, { ...procedure, name: procedure.name.trim() }),
      };
    }
    case 'set-offer': {
      branchFor(command.branchId);
      check(
        canManageCatalog(actor),
        'Solo el jefe de departamento o root configura trámites por sede.',
      );
      check(
        command.procedureIds.every((id) => db.procedures.some((procedure) => procedure.id === id)),
        'Hay trámites inexistentes.',
      );
      const keep = db.branchProcedures.filter((link) => link.branchId !== command.branchId);
      const existing = new Set(
        db.branchProcedures
          .filter((link) => link.branchId === command.branchId)
          .map((link) => link.procedureId),
      );
      const all = new Set([...existing, ...command.procedureIds]);
      return {
        ...db,
        branchProcedures: [
          ...keep,
          ...Array.from(all).map((procedureId) => ({
            branchId: command.branchId,
            procedureId,
            active: command.procedureIds.includes(procedureId),
          })),
        ],
      };
    }
    case 'save-user': {
      check(canCreateUsers(actor), 'Solo root puede crear o actualizar cuentas.');
      check(
        command.user.role === 'DEPARTMENT_HEAD' || command.user.role === 'COUNTER_HEAD',
        'El alta permite únicamente cuentas de jefes.',
      );
      const previous = db.users.find((user) => user.id === command.user.id);
      check(
        !previous || (previous.role !== 'ROOT' && previous.role === command.user.role),
        'No se puede cambiar el rol de una cuenta existente.',
      );
      check(
        Boolean(command.user.name.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.user.email),
        'Introduce nombre y correo válidos.',
      );
      check(
        !db.users.some(
          (user) =>
            user.email.toLowerCase() === command.user.email.toLowerCase() &&
            user.id !== command.user.id,
        ),
        'Este correo ya existe.',
      );
      return {
        ...db,
        users: replace(db.users, { ...command.user, name: command.user.name.trim() }),
      };
    }
    case 'save-slot': {
      branchFor(command.slot.branchId);
      const slot = command.slot;
      const previous = db.slots.find((item) => item.id === slot.id);
      if (previous)
        check(previous.branchId === slot.branchId, 'No se puede trasladar un horario a otra sede.');
      check(
        /^\d{4}-\d{2}-\d{2}$/.test(slot.date) &&
          /^\d{2}:\d{2}$/.test(slot.startsAt) &&
          /^\d{2}:\d{2}$/.test(slot.endsAt),
        'Completa fecha y horas válidas.',
      );
      check(slot.startsAt < slot.endsAt, 'La hora final debe ser posterior a la inicial.');
      check(
        Number.isInteger(slot.capacity) && slot.capacity > 0 && slot.capacity >= slot.occupied,
        'La capacidad debe ser positiva y no menor a los cupos ocupados.',
      );
      check(
        !db.slots.some(
          (item) =>
            item.id !== slot.id &&
            item.branchId === slot.branchId &&
            item.date === slot.date &&
            item.active &&
            slot.active &&
            slot.startsAt < item.endsAt &&
            slot.endsAt > item.startsAt,
        ),
        'El horario se superpone con otro bloque activo de la sede.',
      );
      return { ...db, slots: replace(db.slots, slot) };
    }
    case 'appointment-status': {
      const appointment = db.appointments.find((item) => item.id === command.appointmentId);
      check(Boolean(appointment), 'Cita inexistente.');
      branchFor(appointment!.branchId);
      check(
        appointment!.status === 'SCHEDULED' &&
          ['ATTENDED', 'CANCELLED', 'NO_SHOW'].includes(command.status),
        'Solo se puede resolver una cita programada.',
      );
      const start = new Date(appointment!.scheduledAt);
      const attended = command.status === 'ATTENDED';
      const changed = {
        ...appointment!,
        status: command.status,
        arrivedAt: attended ? start.toISOString() : null,
        startedAt: attended ? new Date(start.getTime() + 5 * 60_000).toISOString() : null,
        endedAt: attended ? new Date(start.getTime() + 30 * 60_000).toISOString() : null,
        finalStatus: attended ? 'Gestión concluida · simulación' : null,
      };
      return { ...db, appointments: replace(db.appointments, changed) };
    }
  }
}
