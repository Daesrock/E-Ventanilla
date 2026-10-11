import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './core/persistence/database.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { StatusController } from './features/catalog/status.controller.js';
export { StatusController } from './features/catalog/status.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule, ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [StatusController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
