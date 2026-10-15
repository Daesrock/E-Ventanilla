/**
 * Datos ficticios reproducibles de una dependencia. No describen catálogo oficial,
 * costos reales ni ciudadanos reales. Cada cita utiliza una asociación sede-trámite.
 */
import type { Appointment, Branch, DemoDatabase, Procedure, StaffUser } from '../types/domain';
import { localDate } from '../utils/format';

const users: StaffUser[] = [
  {
    id: 'demo-root',
    name: 'Administrador inicial',
    email: 'root@ejemplo.invalid',
    role: 'ROOT',
    active: true,
  },
  {
    id: 'demo-department',
    name: 'Mariana Hernández',
    email: 'mariana@ejemplo.invalid',
    role: 'DEPARTMENT_HEAD',
    active: true,
  },
  {
    id: 'demo-counter',
    name: 'Lucía Gómez',
    email: 'lucia@ejemplo.invalid',
    role: 'COUNTER_HEAD',
    active: true,
  },
  {
    id: 'head-tapachula',
    name: 'Diego Méndez',
    email: 'diego@ejemplo.invalid',
    role: 'COUNTER_HEAD',
    active: true,
  },
  {
    id: 'head-sancristobal',
    name: 'Ana López',
    email: 'ana@ejemplo.invalid',
    role: 'COUNTER_HEAD',
    active: true,
  },
  {
    id: 'head-comitan',
    name: 'Carlos Ruiz',
    email: 'carlos@ejemplo.invalid',
    role: 'COUNTER_HEAD',
    active: true,
  },
];

const branches: Branch[] = [
  {
    id: 'tuxtla-vuge',
    name: 'VUGE Tuxtla Gutiérrez',
    type: 'VUGE',
    municipality: 'Tuxtla Gutiérrez',
    municipalityCode: '07101',
    address: 'Av. Central Poniente · dirección de demostración',
    phone: '961 000 0101',
    counterHeadId: 'demo-counter',
    active: true,
    published: true,
  },
  {
    id: 'tuxtla-vim',
    name: 'VIM Tuxtla Gutiérrez',
    type: 'VIM',
    municipality: 'Tuxtla Gutiérrez',
    municipalityCode: '07101',
    address: 'Zona centro · dirección de demostración',
    phone: '961 000 0102',
    counterHeadId: 'demo-counter',
    active: true,
    published: true,
  },
  {
    id: 'tapachula-vuge',
    name: 'VUGE Tapachula',
    type: 'VUGE',
    municipality: 'Tapachula',
    municipalityCode: '07089',
    address: 'Centro administrativo · dirección de demostración',
    phone: '962 000 0103',
    counterHeadId: 'head-tapachula',
    active: true,
    published: true,
  },
  {
    id: 'sancristobal-vim',
    name: 'VIM San Cristóbal',
    type: 'VIM',
    municipality: 'San Cristóbal de las Casas',
    municipalityCode: '07078',
    address: 'Zona centro · dirección de demostración',
    phone: '967 000 0104',
    counterHeadId: 'head-sancristobal',
    active: true,
    published: true,
  },
  {
    id: 'comitan-vim',
    name: 'VIM Comitán',
    type: 'VIM',
    municipality: 'Comitán de Domínguez',
    municipalityCode: '07019',
    address: 'Centro de atención · dirección de demostración',
    phone: '963 000 0105',
    counterHeadId: 'head-comitan',
    active: true,
    published: true,
  },
  {
    id: 'palenque-vuge',
    name: 'VUGE Palenque',
    type: 'VUGE',
    municipality: 'Palenque',
    municipalityCode: '07065',
    address: 'Centro administrativo · dirección de demostración',
    phone: '916 000 0106',
    counterHeadId: null,
    active: true,
    published: false,
  },
];

const procedures: Procedure[] = [
  {
    id: 'apertura',
    name: 'Orientación para apertura de empresa',
    category: 'Gestión empresarial',
    description: 'Acompañamiento inicial para identificar los trámites de una nueva empresa.',
    requirements: 'Identificación oficial\nInformación general del proyecto empresarial',
    cost: 0,
    estimatedMinutes: 30,
    active: true,
    published: true,
  },
  {
    id: 'registro',
    name: 'Asesoría de registro empresarial',
    category: 'Gestión empresarial',
    description: 'Revisión de información para orientar el registro del negocio.',
    requirements: 'Identificación oficial\nInformación del negocio\nComprobante de domicilio',
    cost: 0,
    estimatedMinutes: 40,
    active: true,
    published: true,
  },
  {
    id: 'licencia',
    name: 'Orientación sobre licencia de funcionamiento',
    category: 'Ventanilla integral',
    description: 'Orientación sobre requisitos y canalización a la autoridad competente.',
    requirements: 'Identificación oficial\nDomicilio del establecimiento\nDescripción de actividad',
    cost: 0,
    estimatedMinutes: 25,
    active: true,
    published: true,
  },
  {
    id: 'constancia',
    name: 'Solicitud de constancia · ejemplo',
    category: 'Ventanilla integral',
    description: 'Trámite ficticio para demostrar un costo central compartido entre sedes.',
    requirements: 'Identificación oficial\nSolicitud de ejemplo',
    cost: 250,
    estimatedMinutes: 20,
    active: true,
    published: true,
  },
  {
    id: 'seguimiento',
    name: 'Seguimiento de gestión empresarial',
    category: 'Gestión empresarial',
    description: 'Consulta de avance y orientación para continuar una gestión.',
    requirements: 'Identificación oficial\nFolio de la gestión anterior',
    cost: 0,
    estimatedMinutes: 20,
    active: true,
    published: true,
  },
];

/** Construye un conjunto nuevo. Las fechas siguen el mes de referencia institucional. */
export function createSeed(now = new Date()): DemoDatabase {
  const referenceDate = localDate(now.toISOString());
  const [year, month, today] = referenceDate.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const branchProcedures = branches.flatMap((branch, index) =>
    procedures
      .filter(
        (_, procedureIndex) =>
          branch.type === 'VUGE' || procedureIndex !== index % procedures.length,
      )
      .map((procedure) => ({ branchId: branch.id, procedureId: procedure.id, active: true })),
  );
  const names = [
    'Andrea Martínez',
    'Daniel Pérez',
    'Sofía Jiménez',
    'José Sánchez',
    'Valeria Díaz',
    'Luis Torres',
    'Fernanda Cruz',
    'Miguel Rodríguez',
  ];
  const appointments: Appointment[] = Array.from({ length: 216 }, (_, index) => {
    const branch = branches[index % branches.length];
    const offered = branchProcedures.filter((link) => link.branchId === branch.id);
    const procedureId = offered[Math.floor(index / branches.length) % offered.length].procedureId;
    const day = 1 + (Math.floor(index / branches.length) % days);
    const hour = 9 + (index % 5);
    const scheduledAt = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00-06:00`;
    const past = day < today;
    const status = !past
      ? 'SCHEDULED'
      : index % 13 === 0
        ? 'CANCELLED'
        : index % 11 === 0
          ? 'NO_SHOW'
          : 'ATTENDED';
    const attendance = status === 'ATTENDED';
    const start = new Date(new Date(scheduledAt).getTime() + (5 + (index % 12)) * 60_000);
    return {
      id: `appointment-${index + 1}`,
      folio: `EV-${year}-${String(index + 1).padStart(4, '0')}`,
      citizenId: `citizen-${index % 84}`,
      citizenName: `${names[index % names.length]} · ejemplo ${1 + Math.floor(index / names.length)}`,
      branchId: branch.id,
      procedureId,
      scheduledAt,
      status,
      arrivedAt: attendance ? scheduledAt : null,
      startedAt: attendance ? start.toISOString() : null,
      endedAt: attendance
        ? new Date(start.getTime() + (18 + (index % 25)) * 60_000).toISOString()
        : null,
      finalStatus: attendance
        ? index % 4 === 0
          ? 'Requiere seguimiento'
          : 'Gestión concluida'
        : null,
    };
  });
  const slots = branches.flatMap((branch) =>
    Array.from({ length: 6 }, (_, index) => {
      const date = new Date(`${referenceDate}T12:00:00-06:00`);
      date.setUTCDate(date.getUTCDate() + index);
      return {
        id: `slot-${branch.id}-${index}`,
        branchId: branch.id,
        date: localDate(date.toISOString()),
        startsAt: '09:00',
        endsAt: '14:00',
        capacity: 24,
        occupied: 8 + index * 2,
        active: true,
      };
    }),
  );
  return {
    version: 1,
    referenceDate,
    users: structuredClone(users),
    branches: structuredClone(branches),
    procedures: structuredClone(procedures),
    branchProcedures,
    slots,
    appointments,
  };
}
