import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './core/persistence/database.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { AdminModule } from './features/admin/admin.module.js';
import { StatusController } from './features/catalog/status.controller.js';
import { PublicCatalogController } from './features/catalog/public-catalog.controller.js';
import { PublicCatalogService } from './features/catalog/public-catalog.service.js';
import { BranchRoutingController } from './features/routing/branch-routing.controller.js';
import { BranchRoutingService } from './features/routing/branch-routing.service.js';
import { OsrmClient } from './features/routing/osrm.client.js';
import { config } from './core/configuration/config.js';
export { StatusController } from './features/catalog/status.controller.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AdminModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
  controllers: [StatusController, PublicCatalogController, BranchRoutingController],
  providers: [
    PublicCatalogService,
    BranchRoutingService,
    { provide: OsrmClient, useFactory: () => new OsrmClient(config.osrmUrl) },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
