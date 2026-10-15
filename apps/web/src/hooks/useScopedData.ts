/** Selección central de datos accesibles al perfil demostrativo actual. */
import { useDemo } from '../app/providers/demo-context';
import { scopedBranches } from '../features/auth/policy';

export function useScopedData() {
  const { db, user } = useDemo();
  const branches = user ? scopedBranches(db.branches, user) : [];
  const ids = new Set(branches.map((branch) => branch.id));
  return {
    branches,
    appointments: db.appointments.filter((appointment) => ids.has(appointment.branchId)),
    slots: db.slots.filter((slot) => ids.has(slot.branchId)),
    procedures: db.procedures,
  };
}
