/**
 * Sedes de la dependencia: alta, actualización, responsable y oferta de trámites.
 * El jefe de ventanilla solo actualiza domicilio/contacto dentro de su alcance;
 * root y jefe de departamento operan sobre toda la dependencia.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { resolveMunicipality } from '../catalog/municipalities.js';
import { writeAudit } from './admin.audit.js';
import { assertBranchScope } from './admin.auth.js';
import { assertPublicationSource } from './admin.publication.js';
import { providedFields } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { BranchCreateDto, BranchHeadDto, BranchUpdateDto, OfferUpdateDto } from './admin.dto.js';

const branchAdminSelect = {
  id: true,
  name: true,
  type: true,
  active: true,
  published: true,
  street: true,
  exteriorNumber: true,
  interiorNumber: true,
  neighborhood: true,
  postalCode: true,
  address: true,
  phone: true,
  email: true,
  officeHours: true,
  latitude: true,
  longitude: true,
  sourceKey: true,
  sourceUrl: true,
  sourceSha256: true,
  sourceCheckedAt: true,
  municipality: { select: { code: true, name: true } },
  counterHeadId: true,
  counterHead: {
    select: {
      staff: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              paternalLastName: true,
              maternalLastName: true,
              lastName: true,
              active: true,
            },
          },
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BranchSelect;

type BranchRow = Prisma.BranchGetPayload<{ select: typeof branchAdminSelect }>;

// Campos que el jefe de ventanilla puede mantener: domicilio y contacto.
const counterHeadFields = [
  'street',
  'exteriorNumber',
  'interiorNumber',
  'neighborhood',
  'postalCode',
  'address',
  'phone',
  'email',
  'officeHours',
  'latitude',
  'longitude',
];

function present(row: BranchRow) {
  return {
    ...row,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    sourceCheckedAt: row.sourceCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    counterHead: row.counterHead
      ? {
          id: row.counterHead.staff.user.id,
          name: [
            row.counterHead.staff.user.firstName,
            [row.counterHead.staff.user.paternalLastName, row.counterHead.staff.user.maternalLastName]
              .filter(Boolean)
              .join(' ') || row.counterHead.staff.user.lastName,
          ]
            .filter(Boolean)
            .join(' '),
          active: row.counterHead.staff.user.active,
        }
      : null,
  };
}

function assertCoordinates(latitude: number | null | undefined, longitude: number | null | undefined) {
  const provided = latitude !== undefined || longitude !== undefined;
  if (!provided) return undefined;
  if (latitude === undefined || longitude === undefined)
    throw fieldFailure({
      latitude: 'Indica latitud y longitud juntas o deja ambas vacías.',
      longitude: 'Indica latitud y longitud juntas o deja ambas vacías.',
    });
  if ((latitude === null) !== (longitude === null))
    throw fieldFailure({
      latitude: 'Indica latitud y longitud juntas o deja ambas vacías.',
      longitude: 'Indica latitud y longitud juntas o deja ambas vacías.',
    });
  return { latitude, longitude };
}

@Injectable()
export class BranchesAdminService {
  constructor(private readonly db: DatabaseService) {}

  async list(admin: AdminContext, query: Record<string, unknown>) {
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 120) : undefined;
    const rows = await this.db.branch.findMany({
      where: {
        ...(admin.allBranches ? {} : { id: { in: admin.branchIds } }),
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      select: branchAdminSelect,
      orderBy: { name: 'asc' },
    });
    return { items: rows.map(present) };
  }

  async create(admin: AdminContext, data: BranchCreateDto) {
    const municipality = resolveMunicipality(data.municipalityCode);
    const origin = await this.db.municipality.findUnique({ where: { code: municipality.code } });
    if (!origin)
      throw fieldFailure({ municipalityCode: 'El municipio no está registrado en la base.' });
    assertCoordinates(data.latitude, data.longitude);
    if (data.published === true)
      assertPublicationSource({
        sourceKey: data.sourceKey,
        sourceUrl: data.sourceUrl,
        sourceSha256: data.sourceSha256,
        sourceCheckedAt: data.sourceCheckedAt,
      });
    const created = await this.db.$transaction(async (transaction) => {
      const row = await transaction.branch.create({
        data: {
          municipalityId: origin.id,
          name: data.name,
          type: data.type,
          street: data.street,
          exteriorNumber: data.exteriorNumber,
          interiorNumber: data.interiorNumber,
          neighborhood: data.neighborhood,
          postalCode: data.postalCode,
          address: data.address,
          phone: data.phone,
          email: data.email,
          officeHours: data.officeHours,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          published: data.published ?? false,
          sourceKey: data.sourceKey,
          sourceUrl: data.sourceUrl,
          sourceSha256: data.sourceSha256,
          sourceCheckedAt:
            data.sourceCheckedAt === undefined ? undefined : new Date(data.sourceCheckedAt),
        },
        select: branchAdminSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'branch.create',
        resourceType: 'Branch',
        resourceId: row.id,
        branchId: row.id,
        metadata: { published: row.published },
      });
      return row;
    });
    return present(created);
  }

  async update(admin: AdminContext, id: string, data: BranchUpdateDto) {
    const existing = await this.db.branch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('La sede no existe.');
    assertBranchScope(admin, id);
    const counterHead = admin.role.code === 'COUNTER_HEAD';
    if (counterHead) {
      const blocked = providedFields(data).filter((field) => !counterHeadFields.includes(field));
      if (blocked.length) {
        await writeAudit(this.db, {
          actorUserId: admin.userId,
          action: 'branch.update',
          resourceType: 'Branch',
          resourceId: id,
          branchId: id,
          outcome: 'rejected',
          metadata: { fields: blocked.join(',') },
        });
        throw fieldFailure(
          Object.fromEntries(
            blocked.map((field) => [field, 'La cuenta de ventanilla no puede modificar este campo.']),
          ),
        );
      }
    }
    const coordinates = assertCoordinates(data.latitude, data.longitude);
    let municipalityId: string | undefined;
    if (data.municipalityCode !== undefined) {
      const municipality = resolveMunicipality(data.municipalityCode);
      const origin = await this.db.municipality.findUnique({ where: { code: municipality.code } });
      if (!origin)
        throw fieldFailure({ municipalityCode: 'El municipio no está registrado en la base.' });
      municipalityId = origin.id;
    }
    const merged = {
      sourceKey: data.sourceKey ?? existing.sourceKey,
      sourceUrl: data.sourceUrl ?? existing.sourceUrl,
      sourceSha256: data.sourceSha256 ?? existing.sourceSha256,
      sourceCheckedAt: data.sourceCheckedAt ?? existing.sourceCheckedAt?.toISOString(),
    };
    if ((data.published ?? existing.published) === true) assertPublicationSource(merged);
    const fields = providedFields(data);
    const updated = await this.db.$transaction(async (transaction) => {
      const row = await transaction.branch.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          municipalityId,
          street: data.street,
          exteriorNumber: data.exteriorNumber,
          interiorNumber: data.interiorNumber,
          neighborhood: data.neighborhood,
          postalCode: data.postalCode,
          address: data.address,
          phone: data.phone,
          email: data.email,
          officeHours: data.officeHours,
          ...(coordinates ?? {}),
          active: counterHead ? undefined : data.active,
          published: counterHead ? undefined : data.published,
          sourceKey: data.sourceKey,
          sourceUrl: data.sourceUrl,
          sourceSha256: data.sourceSha256,
          sourceCheckedAt:
            data.sourceCheckedAt === undefined ? undefined : new Date(data.sourceCheckedAt),
        },
        select: branchAdminSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'branch.update',
        resourceType: 'Branch',
        resourceId: id,
        branchId: id,
        metadata: { fields: fields.join(',') },
      });
      return row;
    });
    return present(updated);
  }

  async assignHead(admin: AdminContext, id: string, data: BranchHeadDto) {
    if (admin.role.code === 'COUNTER_HEAD')
      throw new ForbiddenException({
        message: 'La cuenta de ventanilla no puede asignar responsables.',
        code: 'ADMIN_PERMISSION_REQUIRED',
      });
    assertBranchScope(admin, id);
    const branch = await this.db.branch.findUnique({ where: { id }, select: { id: true } });
    if (!branch) throw new NotFoundException('La sede no existe.');
    const counterHeadId = data.counterHeadId ?? null;
    if (counterHeadId) {
      const head = await this.db.counterHead.findUnique({
        where: { userId: counterHeadId },
        include: {
          staff: {
            include: { user: { select: { active: true, role: { select: { code: true } } } } },
          },
        },
      });
      if (!head || !head.staff.user.active || head.staff.user.role.code !== 'COUNTER_HEAD')
        throw fieldFailure({ counterHeadId: 'Selecciona un jefe de ventanilla activo.' });
    }
    const updated = await this.db.$transaction(async (transaction) => {
      const row = await transaction.branch.update({
        where: { id },
        data: { counterHeadId },
        select: branchAdminSelect,
      });
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'branch.head.assign',
        resourceType: 'Branch',
        resourceId: id,
        branchId: id,
        metadata: { assigned: !!counterHeadId },
      });
      return row;
    });
    return present(updated);
  }

  async offersFor(admin: AdminContext, branchId: string) {
    assertBranchScope(admin, branchId);
    const branch = await this.db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw new NotFoundException('La sede no existe.');
    const rows = await this.db.procedure.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        cost: true,
        active: true,
        published: true,
        branches: { where: { branchId }, select: { active: true } },
      },
      orderBy: { name: 'asc' },
    });
    return {
      items: rows.map((row) => ({
        procedureId: row.id,
        name: row.name,
        category: row.category,
        cost: row.cost?.toString() ?? null,
        procedureActive: row.active,
        procedurePublished: row.published,
        active: row.branches[0]?.active ?? false,
      })),
    };
  }

  async updateOffers(admin: AdminContext, branchId: string, data: OfferUpdateDto) {
    assertBranchScope(admin, branchId);
    const branch = await this.db.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw new NotFoundException('La sede no existe.');
    const unique = new Set(data.items.map((item) => item.procedureId));
    if (unique.size !== data.items.length)
      throw fieldFailure({ items: 'Cada trámite debe aparecer una sola vez.' });
    const found = await this.db.procedure.count({ where: { id: { in: [...unique] } } });
    if (found !== unique.size)
      throw fieldFailure({ items: 'Alguno de los trámites indicados no existe.' });
    await this.db.$transaction(async (transaction) => {
      for (const item of data.items) {
        await transaction.branchProcedure.upsert({
          where: {
            branchId_procedureId: { branchId, procedureId: item.procedureId },
          },
          create: { branchId, procedureId: item.procedureId, active: item.active },
          update: { active: item.active },
        });
      }
      await writeAudit(transaction, {
        actorUserId: admin.userId,
        action: 'offer.update',
        resourceType: 'Branch',
        resourceId: branchId,
        branchId,
        metadata: { items: data.items.length },
      });
    });
    return this.offersFor(admin, branchId);
  }
}
