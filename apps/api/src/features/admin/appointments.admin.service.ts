/**
 * Citas y atención administrativa: consulta por alcance y registro de llegada,
 * inicio y fin sobre `Attendance`. Los estados/transiciones de `Appointment.status`
 * siguen pendientes de definición (ver docs), por eso aquí no se inventan.
 */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { assertDateRange } from './admin.time.js';
import { writeAudit } from './admin.audit.js';
import { assertBranchScope } from './admin.auth.js';
import {
  optionalDate,
  optionalText,
  optionalUuid,
  pageParams,
  personName,
} from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { AttendanceDto } from './admin.dto.js';

const appointmentAdminSelect = {
  id: true,
  folio: true,
  status: true,
  scheduledAt: true,
  branchId: true,
  procedureId: true,
  // La oferta es la ruta a la sede y al trámite: Appointment no tiene esas relaciones directas.
  slot: {
    select: {
      branch: {
        select: { id: true, name: true, municipality: { select: { code: true, name: true } } },
      },
    },
  },
  offering: { select: { procedure: { select: { id: true, name: true, cost: true } } } },
  citizen: {
    select: {
      user: {
        select: {
          firstName: true,
          paternalLastName: true,
          maternalLastName: true,
          lastName: true,
        },
      },
    },
  },
  attendance: {
    select: { arrivedAt: true, qrValidatedAt: true, startedAt: true, endedAt: true, late: true },
  },
} satisfies Prisma.AppointmentSelect;

type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof appointmentAdminSelect }>;

function present(row: AppointmentRow) {
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    branch: {
      id: row.slot.branch.id,
      name: row.slot.branch.name,
      municipality: row.slot.branch.municipality.name,
      municipalityCode: row.slot.branch.municipality.code,
    },
    procedure: {
      id: row.offering.procedure.id,
      name: row.offering.procedure.name,
      cost: row.offering.procedure.cost?.toString() ?? null,
    },
    citizen: { name: personName(row.citizen.user) },
    attendance: row.attendance
      ? {
          arrivedAt: row.attendance.arrivedAt.toISOString(),
          qrValidatedAt: row.attendance.qrValidatedAt?.toISOString() ?? null,
          startedAt: row.attendance.startedAt?.toISOString() ?? null,
          endedAt: row.attendance.endedAt?.toISOString() ?? null,
          late: row.attendance.late,
        }
      : null,
  };
}

@Injectable()
export class AppointmentsAdminService {
  constructor(private readonly db: DatabaseService) {}

  async list(admin: AdminContext, query: Record<string, unknown>) {
    const branchId = optionalUuid(query.branchId, 'branchId');
    if (branchId) assertBranchScope(admin, branchId);
    const from = optionalDate(query.from, 'from');
    const to = optionalDate(query.to, 'to');
    if ((from === undefined) !== (to === undefined))
      throw fieldFailure({
        from: 'Indica fecha inicial y final juntas.',
        to: 'Indica fecha inicial y final juntas.',
      });
    const status = optionalText(query.status, 'status', 100);
    const procedureId = optionalUuid(query.procedureId, 'procedureId');
    const range = from && to ? assertDateRange(from, to) : undefined;
    const { page, pageSize, skip, take } = pageParams(query);
    const where: Prisma.AppointmentWhereInput = {
      ...(admin.allBranches
        ? branchId
          ? { branchId }
          : {}
        : { branchId: branchId ?? { in: admin.branchIds } }),
      ...(range ? { scheduledAt: { gte: range.start, lte: range.end } } : {}),
      ...(status ? { status } : {}),
      ...(procedureId ? { procedureId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        select: appointmentAdminSelect,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take,
      }),
      this.db.appointment.count({ where }),
    ]);
    return {
      items: rows.map(present),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async attendance(admin: AdminContext, appointmentId: string, data: AttendanceDto) {
    if (!admin.staffProfiles.counterStaff)
      throw new ForbiddenException({
        message: 'Tu cuenta no tiene perfil técnico de ventanilla para registrar atención.',
        code: 'COUNTER_STAFF_REQUIRED',
      });
    return this.db.$transaction(async (transaction) => {
      // Un solo operador puede cambiar la atención de una cita a la vez.
      await transaction.$queryRaw`SELECT id FROM "Appointment" WHERE id = ${appointmentId}::uuid FOR UPDATE`;
      const appointment = await transaction.appointment.findUnique({
        where: { id: appointmentId },
        include: { attendance: true },
      });
      if (!appointment) throw new NotFoundException('La cita no existe.');
      assertBranchScope(admin, appointment.branchId);
      const now = new Date();
      let attendance = appointment.attendance;
      if (data.action === 'arrive') {
        if (attendance) throw new ConflictException('La cita ya tiene llegada registrada.');
        if (!data.counterId)
          throw fieldFailure({ counterId: 'Selecciona el mostrador de atención.' });
        const counter = await transaction.serviceCounter.findFirst({
          where: { id: data.counterId, branchId: appointment.branchId, active: true },
          select: { id: true },
        });
        if (!counter)
          throw fieldFailure({ counterId: 'El mostrador no está disponible en la sede.' });
        if (data.qrToken !== undefined && data.qrToken !== appointment.qrToken)
          throw fieldFailure({ qrToken: 'El código QR no corresponde a la cita.' });
        attendance = await transaction.attendance.create({
          data: {
            appointmentId,
            branchId: appointment.branchId,
            staffId: admin.userId,
            counterId: data.counterId,
            arrivedAt: now,
            qrValidatedAt: data.qrToken === undefined ? null : now,
            late: data.late ?? false,
          },
        });
      } else {
        if (!attendance) throw fieldFailure({ action: 'Registra primero la llegada de la cita.' });
        if (data.action === 'start') {
          if (attendance.startedAt) throw new ConflictException('La atención ya fue iniciada.');
          attendance = await transaction.attendance.update({
            where: { appointmentId },
            data: { startedAt: now },
          });
        } else {
          if (!attendance.startedAt)
            throw fieldFailure({ action: 'Registra primero el inicio de la atención.' });
          if (attendance.endedAt) throw new ConflictException('La atención ya fue finalizada.');
          attendance = await transaction.attendance.update({
            where: { appointmentId },
            data: { endedAt: now },
          });
        }
      }
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: `appointment.attendance.${data.action}`,
        resourceType: 'Appointment',
        resourceId: appointmentId,
        branchId: appointment.branchId,
        ...(data.action === 'arrive'
          ? { metadata: { late: attendance.late, qr: data.qrToken !== undefined } }
          : {}),
      });
      return {
        appointmentId,
        folio: appointment.folio,
        status: appointment.status,
        attendance: {
          arrivedAt: attendance.arrivedAt.toISOString(),
          qrValidatedAt: attendance.qrValidatedAt?.toISOString() ?? null,
          startedAt: attendance.startedAt?.toISOString() ?? null,
          endedAt: attendance.endedAt?.toISOString() ?? null,
          late: attendance.late,
        },
      };
    });
  }
}
