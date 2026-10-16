/**
 * Horarios y cupos por sede. `occupied` jamás se edita aquí: lo deriva el trigger
 * de PostgreSQL al reservar citas. Se validan horas, superposición y capacidad.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import {
  dateOnlyToDate,
  dateToDateString,
  dateToTime,
  rangesOverlap,
  timeToDate,
  timeToMinutes,
} from './admin.time.js';
import { writeAudit } from './admin.audit.js';
import { assertBranchScope } from './admin.auth.js';
import { optionalDate, providedFields } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { SlotCreateDto, SlotUpdateDto } from './admin.dto.js';

const slotSelect = {
  id: true,
  branchId: true,
  date: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  occupied: true,
  active: true,
} satisfies Prisma.TimeSlotSelect;

type SlotRow = Prisma.TimeSlotGetPayload<{ select: typeof slotSelect }>;

function present(row: SlotRow) {
  return {
    id: row.id,
    branchId: row.branchId,
    date: dateToDateString(row.date),
    startsAt: dateToTime(row.startsAt),
    endsAt: dateToTime(row.endsAt),
    capacity: row.capacity,
    occupied: row.occupied,
    active: row.active,
  };
}

@Injectable()
export class SlotsAdminService {
  constructor(private readonly db: DatabaseService) {}

  private async assertBranch(branchId: string) {
    const branch = await this.db.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('La sede no existe.');
  }

  async list(admin: AdminContext, branchId: string, query: Record<string, unknown>) {
    assertBranchScope(admin, branchId);
    await this.assertBranch(branchId);
    const from = optionalDate(query.from, 'from');
    const to = optionalDate(query.to, 'to');
    if (from && to && from > to)
      throw fieldFailure({ from: 'La fecha inicial debe ser anterior o igual a la final.' });
    const rows = await this.db.timeSlot.findMany({
      where: {
        branchId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: dateOnlyToDate(from) } : {}),
                ...(to ? { lte: dateOnlyToDate(to) } : {}),
              },
            }
          : {}),
      },
      select: slotSelect,
      orderBy: [{ date: 'asc' }, { startsAt: 'asc' }],
    });
    return { items: rows.map(present) };
  }

  private async assertNoOverlap(
    transaction: Prisma.TransactionClient,
    branchId: string,
    date: string,
    start: number,
    end: number,
    excludeId?: string,
  ) {
    const slots = await transaction.timeSlot.findMany({
      where: { branchId, date: dateOnlyToDate(date), active: true },
      select: { id: true, startsAt: true, endsAt: true },
    });
    const clash = slots.some(
      (slot) =>
        slot.id !== excludeId &&
        rangesOverlap(
          start,
          end,
          slot.startsAt.getUTCHours() * 60 + slot.startsAt.getUTCMinutes(),
          slot.endsAt.getUTCHours() * 60 + slot.endsAt.getUTCMinutes(),
        ),
    );
    if (clash)
      throw fieldFailure({
        startsAt: 'El horario se superpone con otro bloque activo de la sede.',
      });
  }

  async create(admin: AdminContext, branchId: string, data: SlotCreateDto) {
    assertBranchScope(admin, branchId);
    await this.assertBranch(branchId);
    const start = timeToMinutes(data.startsAt);
    const end = timeToMinutes(data.endsAt);
    if (start >= end)
      throw fieldFailure({ endsAt: 'La hora final debe ser mayor que la inicial.' });
    const created = await this.db.$transaction(async (transaction) => {
      // Serializa cambios de horarios de una sede, incluso si aún no hay bloques.
      await transaction.$queryRaw`SELECT id FROM "Branch" WHERE id = ${branchId}::uuid FOR NO KEY UPDATE`;
      await this.assertNoOverlap(transaction, branchId, data.date, start, end);
      const row = await transaction.timeSlot.create({
        data: {
          branchId,
          date: dateOnlyToDate(data.date),
          startsAt: timeToDate(data.startsAt),
          endsAt: timeToDate(data.endsAt),
          capacity: data.capacity,
        },
        select: slotSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'slot.create',
        resourceType: 'TimeSlot',
        resourceId: row.id,
        branchId,
        metadata: { date: data.date },
      });
      return row;
    });
    return present(created);
  }

  async update(admin: AdminContext, id: string, data: SlotUpdateDto) {
    const reference = await this.db.timeSlot.findUnique({ where: { id } });
    if (!reference) throw new NotFoundException('El bloque de horario no existe.');
    assertBranchScope(admin, reference.branchId);
    const updated = await this.db.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "Branch" WHERE id = ${reference.branchId}::uuid FOR NO KEY UPDATE`;
      await transaction.$queryRaw`SELECT id FROM "TimeSlot" WHERE id = ${id}::uuid FOR UPDATE`;
      const existing = await transaction.timeSlot.findUniqueOrThrow({ where: { id } });
      const start = data.startsAt === undefined ? dateToTime(existing.startsAt) : data.startsAt;
      const end = data.endsAt === undefined ? dateToTime(existing.endsAt) : data.endsAt;
      if (timeToMinutes(start) >= timeToMinutes(end))
        throw fieldFailure({ endsAt: 'La hora final debe ser mayor que la inicial.' });
      const capacity = data.capacity ?? existing.capacity;
      if (capacity < existing.occupied)
        throw fieldFailure({
          capacity: 'La capacidad no puede ser menor que los lugares ya ocupados.',
        });
      const active = data.active ?? existing.active;
      const changedTimes = data.startsAt !== undefined || data.endsAt !== undefined;
      const movesSchedule =
        start !== dateToTime(existing.startsAt) || end !== dateToTime(existing.endsAt);
      if (movesSchedule && existing.occupied > 0)
        throw fieldFailure({
          startsAt: 'No puedes mover un horario que ya tiene citas reservadas.',
        });
      if (active && (changedTimes || (data.active === true && !existing.active)))
        await this.assertNoOverlap(
          transaction,
          existing.branchId,
          dateToDateString(existing.date),
          timeToMinutes(start),
          timeToMinutes(end),
          id,
        );
      const fields = providedFields(data);
      const row = await transaction.timeSlot.update({
        where: { id },
        data: {
          startsAt: data.startsAt === undefined ? undefined : timeToDate(data.startsAt),
          endsAt: data.endsAt === undefined ? undefined : timeToDate(data.endsAt),
          capacity: data.capacity,
          active: data.active,
        },
        select: slotSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'slot.update',
        resourceType: 'TimeSlot',
        resourceId: id,
        branchId: existing.branchId,
        metadata: { fields: fields.join(',') },
      });
      return row;
    });
    return present(updated);
  }
}
