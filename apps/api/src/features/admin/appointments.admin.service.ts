/**
 * Citas y atención administrativa: consulta por alcance y registro de llegada,
 * inicio y fin sobre `Attendance`. Los estados/transiciones de `Appointment.status`
 * siguen pendientes de definición (ver docs), por eso aquí no se inventan.
 */
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { assertDateRange } from './admin.time.js';
import { writeAudit } from './admin.audit.js';
import { assertBranchScope } from './admin.auth.js';
import { optionalDate, optionalText, optionalUuid, pageParams, personName } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { AttendanceDto } from './admin.dto.js';

const appointmentAdminSelect = {
  id: true,
  folio: true,
  status: true,
  scheduledAt: true,
  branchId: true,
  procedureId: true,
  branch: { select: { id: true, name: true, municipality: { select: { code: true, name: true } } } },
  procedure: { select: { id: true, name: true, cost: true } },
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
      id: row.branch.id,
      name: row.branch.name,
      municipality: row.branch.municipality.name,
      municipalityCode: row.branch.municipality.code,
    },
    procedure: { id: row.procedure.id, name: row.procedure.name, cost: row.procedure.cost?.toString() ?? null },
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
    const appointment = await this.db.appointment.findUnique({
      where: { id: appointmentId },
      include: { attendance: true },
    });
    if (!appointment) throw new NotFoundException('La cita no existe.');
    assertBranchScope(admin, appointment.branchId);
    if (!admin.staffProfiles.counterStaff)
      throw new ForbiddenException({
        message: 'Tu cuenta no tiene perfil técnico de ventanilla para registrar atención.',
        code: 'COUNTER_STAFF_REQUIRED',
      });
    const now = new Date();
    if (data.action === 'arrive') {
      if (appointment.attendance)
        throw new ConflictException('La cita ya tiene llegada registrada.');
      if (!data.counterId)
        throw fieldFailure({ counterId: 'Selecciona el mostrador de atención.' });
      const counter = await this.db.serviceCounter.findFirst({
        where: { id: data.counterId, branchId: appointment.branchId, active: true },
        select: { id: true },
      });
      if (!counter) throw fieldFailure({ counterId: 'El mostrador no está disponible en la sede.' });
      if (data.qrToken !== undefined && data.qrToken !== appointment.qrToken)
        throw fieldFailure({ qrToken: 'El código QR no corresponde a la cita.' });
      const created = await this.db.$transaction(async (transaction) => {
        const attendance = await transaction.attendance.create({
          data: {
            appointmentId: appointment.id,
            branchId: appointment.branchId,
            staffId: admin.userId,
            counterId: data.counterId!,
            arrivedAt: now,
            qrValidatedAt: data.qrToken === undefined ? null : now,
            late: data.late ?? false,
          },
        });
        await writeAudit(transaction, {
          actorUserId: admin.userId,
          action: 'appointment.attendance.arrive',
          resourceType: 'Appointment',
          resourceId: appointment.id,
          branchId: appointment.branchId,
          metadata: { late: attendance.late, qr: data.qrToken !== undefined },
        });
        return attendance;
      });
      return {
        appointmentId: appointment.id,
        folio: appointment.folio,
        status: appointment.status,
        attendance: {
          arrivedAt: created.arrivedAt.toISOString(),
          qrValidatedAt: created.qrValidatedAt?.toISOString() ?? null,
          startedAt: null,
          endedAt: null,
          late: created.late,
        },
      };
    }
    const attendance = appointment.attendance;
    if (!attendance) throw fieldFailure({ action: 'Registra primero la llegada de la cita.' });
    if (data.action === 'start') {
      if (attendance.startedAt) throw new ConflictException('La atención ya fue iniciada.');
      const updated = await this.db.$transaction(async (transaction) => {
        const row = await transaction.attendance.update({
          where: { appointmentId: appointment.id },
          data: { startedAt: now },
        });
        await writeAudit(transaction, {
          actorUserId: admin.userId,
          action: 'appointment.attendance.start',
          resourceType: 'Appointment',
          resourceId: appointment.id,
          branchId: appointment.branchId,
        });
        return row;
      });
      return {
        appointmentId: appointment.id,
        folio: appointment.folio,
        status: appointment.status,
        attendance: {
          arrivedAt: updated.arrivedAt.toISOString(),
          qrValidatedAt: updated.qrValidatedAt?.toISOString() ?? null,
          startedAt: updated.startedAt?.toISOString() ?? null,
          endedAt: null,
          late: updated.late,
        },
      };
    }
    if (!attendance.startedAt)
      throw fieldFailure({ action: 'Registra primero el inicio de la atención.' });
    if (attendance.endedAt) throw new ConflictException('La atención ya fue finalizada.');
    const updated = await this.db.$transaction(async (transaction) => {
      const row = await transaction.attendance.update({
        where: { appointmentId: appointment.id },
        data: { endedAt: now },
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'appointment.attendance.end',
        resourceType: 'Appointment',
        resourceId: appointment.id,
        branchId: appointment.branchId,
      });
      return row;
    });
    return {
      appointmentId: appointment.id,
      folio: appointment.folio,
      status: appointment.status,
      attendance: {
        arrivedAt: updated.arrivedAt.toISOString(),
        qrValidatedAt: updated.qrValidatedAt?.toISOString() ?? null,
        startedAt: updated.startedAt?.toISOString() ?? null,
        endedAt: updated.endedAt?.toISOString() ?? null,
        late: updated.late,
      },
    };
  }
}
