/**
 * Auditoría administrativa: cada mutación deja actor, acción, recurso y resultado.
 * Nunca guarda credenciales, códigos ni tokens; metadata solo lleva detalles controlados.
 */
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuditTarget } from './admin.types.js';

export interface AuditEntry {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  branchId?: string | null;
  outcome?: 'completed' | 'rejected' | 'failed';
  metadata?: Prisma.InputJsonValue;
}

export async function writeAudit(target: AuditTarget, entry: AuditEntry) {
  await target.administrativeAuditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      branchId: entry.branchId ?? null,
      outcome: entry.outcome ?? 'completed',
      metadata: entry.metadata ?? undefined,
    },
  });
}
