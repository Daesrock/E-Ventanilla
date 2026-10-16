import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

// No devolver mensajes de PostgreSQL: pueden incluir datos personales o valores únicos.
@Catch(Prisma.PrismaClientKnownRequestError)
export class AdminDatabaseErrors implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const errors: Record<string, [number, string]> = {
      P2002: [409, 'Ya existe un registro con esos datos únicos.'],
      P2003: [409, 'El registro tiene relaciones que impiden este cambio.'],
      P2025: [404, 'El registro ya no está disponible.'],
      P2034: [409, 'Otro cambio coincidió con esta operación. Intenta nuevamente.'],
    };
    const [status, message] = errors[error.code] ?? [500, 'No fue posible completar la solicitud.'];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
