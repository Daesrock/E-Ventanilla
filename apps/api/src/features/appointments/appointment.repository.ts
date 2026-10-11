import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';

export interface ReservationInput {
  citizenId: string;
  branchId: string;
  procedureId: string;
  slotId: string;
  counterId?: string;
  folio: string;
  qrToken: string;
  scheduledAt: Date;
  status: string;
}

/** Persistencia interna. Las reglas y rutas públicas de citas siguen pendientes. */
@Injectable()
export class AppointmentRepository {
  constructor(private readonly database: DatabaseService) {}

  async reserve(input: ReservationInput) {
    return this.database.$transaction(
      async (transaction) => {
        const citizen = await transaction.citizen.findUniqueOrThrow({
          where: { userId: input.citizenId },
          include: { user: true },
        });
        if (!citizen.user.active || !citizen.user.emailVerifiedAt) {
          throw new Error('La reserva requiere una cuenta activa con correo verificado.');
        }
        const offering = await transaction.branchProcedure.findUniqueOrThrow({
          where: {
            branchId_procedureId: { branchId: input.branchId, procedureId: input.procedureId },
          },
          include: { branch: true, procedure: true },
        });
        if (!offering.active || !offering.branch.active || !offering.procedure.active) {
          throw new Error('El trámite no está disponible en la sede.');
        }
        if (input.counterId) {
          await transaction.serviceCounter.findFirstOrThrow({
            where: { id: input.counterId, branchId: input.branchId, active: true },
          });
        }
        // PostgreSQL reserva el cupo con su trigger; no hay lectura/actualización
        // separadas que puedan admitir reservas por encima de la capacidad.
        return transaction.appointment.create({ data: input });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async releaseCapacity(appointmentId: string, citizenId: string, status: string) {
    // El estado llega de la capa de negocio futura; aquí no inventamos un catálogo.
    return this.database.appointment.update({
      where: { id: appointmentId, citizenId },
      data: { occupiesCapacity: false, status },
    });
  }
}
