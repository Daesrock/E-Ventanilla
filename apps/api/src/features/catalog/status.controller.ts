import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { municipalityCatalog } from './municipalities.js';

@Controller()
export class StatusController {
  constructor(private readonly db: DatabaseService) {}
  @Get('health') health() {
    return { status: 'ok', service: 'e-ventanilla-api' };
  }
  @Get('catalog/municipalities') municipalities() {
    return municipalityCatalog;
  }
  @Get('ready') async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('La base de datos no está disponible.');
    }
  }
  @Get('catalog/status') catalog() {
    return {
      status: 'partially_available',
      message:
        'Consulta las sedes y los servicios publicados. Los requisitos, costos y disponibilidad por sede siguen pendientes de corroboración.',
    };
  }
}
