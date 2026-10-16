/**
 * Catálogo central de trámites: costo único igual en todas las sedes y
 * publicación con fuente corroborada. Solo root y jefe de departamento editan.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { writeAudit } from './admin.audit.js';
import { assertPublicationSource } from './admin.publication.js';
import { optionalFlag, optionalText, providedFields } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { ProcedureCreateDto, ProcedureUpdateDto } from './admin.dto.js';

const procedureAdminSelect = {
  id: true,
  name: true,
  category: true,
  description: true,
  requirements: true,
  cost: true,
  estimatedMinutes: true,
  active: true,
  published: true,
  sourceKey: true,
  sourceUrl: true,
  sourceSha256: true,
  sourceCheckedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProcedureSelect;

type ProcedureRow = Prisma.ProcedureGetPayload<{ select: typeof procedureAdminSelect }>;

function present(row: ProcedureRow) {
  return {
    ...row,
    cost: row.cost?.toString() ?? null,
    sourceCheckedAt: row.sourceCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function checkedAt(value: string | undefined) {
  return value === undefined ? undefined : new Date(value);
}

@Injectable()
export class ProceduresAdminService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: Record<string, unknown>) {
    const q = optionalText(query.q, 'q');
    const active = optionalFlag(query.active, 'active');
    const published = optionalFlag(query.published, 'published');
    const rows = await this.db.procedure.findMany({
      where: {
        ...(active === undefined ? {} : { active }),
        ...(published === undefined ? {} : { published }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { category: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: procedureAdminSelect,
      orderBy: { name: 'asc' },
    });
    return { items: rows.map(present) };
  }

  async create(admin: AdminContext, data: ProcedureCreateDto) {
    if (data.published === true)
      assertPublicationSource({
        sourceKey: data.sourceKey,
        sourceUrl: data.sourceUrl,
        sourceSha256: data.sourceSha256,
        sourceCheckedAt: data.sourceCheckedAt,
      });
    const created = await this.db.$transaction(async (transaction) => {
      const row = await transaction.procedure.create({
        data: {
          name: data.name,
          category: data.category,
          description: data.description,
          requirements: data.requirements,
          cost: data.cost === undefined ? undefined : data.cost === null ? null : data.cost.toFixed(2),
          estimatedMinutes: data.estimatedMinutes,
          published: data.published ?? false,
          sourceKey: data.sourceKey,
          sourceUrl: data.sourceUrl,
          sourceSha256: data.sourceSha256,
          sourceCheckedAt: checkedAt(data.sourceCheckedAt),
        },
        select: procedureAdminSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'procedure.create',
        resourceType: 'Procedure',
        resourceId: row.id,
        metadata: { published: row.published },
      });
      return row;
    });
    return present(created);
  }

  async update(admin: AdminContext, id: string, data: ProcedureUpdateDto) {
    const existing = await this.db.procedure.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('El trámite no existe.');
    const merged = {
      sourceKey: data.sourceKey ?? existing.sourceKey,
      sourceUrl: data.sourceUrl ?? existing.sourceUrl,
      sourceSha256: data.sourceSha256 ?? existing.sourceSha256,
      sourceCheckedAt: data.sourceCheckedAt ?? existing.sourceCheckedAt?.toISOString(),
    };
    if ((data.published ?? existing.published) === true) assertPublicationSource(merged);
    const fields = providedFields(data);
    const updated = await this.db.$transaction(async (transaction) => {
      const row = await transaction.procedure.update({
        where: { id },
        data: {
          name: data.name,
          category: data.category,
          description: data.description,
          requirements: data.requirements,
          cost:
            data.cost === undefined ? undefined : data.cost === null ? null : data.cost.toFixed(2),
          estimatedMinutes: data.estimatedMinutes,
          active: data.active,
          published: data.published,
          sourceKey: data.sourceKey,
          sourceUrl: data.sourceUrl,
          sourceSha256: data.sourceSha256,
          sourceCheckedAt: checkedAt(data.sourceCheckedAt),
        },
        select: procedureAdminSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'procedure.update',
        resourceType: 'Procedure',
        resourceId: id,
        metadata: { fields: fields.join(',') },
      });
      return row;
    });
    return present(updated);
  }
}
