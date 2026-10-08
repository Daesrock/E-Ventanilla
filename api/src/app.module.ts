import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseService } from './database.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MailService } from './mail.service.js';
import { MailWorker } from './mail-worker.service.js';
import { municipalityCatalog } from './municipalities.js';

@Controller()
export class StatusController {
  constructor(private readonly db: DatabaseService) {}
  @Get('health') health() { return { status: 'ok', service: 'e-ventanilla-api' }; }
  @Get('catalog/municipalities') municipalities() { return municipalityCatalog; }
  @Get('ready') async ready() {
    try { await this.db.$queryRaw`SELECT 1`; return { status: 'ok' }; }
    catch { throw new ServiceUnavailableException('La base de datos no está disponible.'); }
  }
  @Get('catalog/status') catalog() {
    return { status: 'pending_verification', message: 'La información institucional está pendiente de corroboración.' };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [StatusController, AuthController],
  providers: [DatabaseService, AuthService, MailService, MailWorker, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
