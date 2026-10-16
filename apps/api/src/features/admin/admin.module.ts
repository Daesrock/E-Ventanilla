/**
 * Módulo del panel administrativo: autorización por rol/permiso/alcance y rutas
 * aditivas bajo `/v1/admin/*`. No altera los contratos ciudadanos ni el catálogo.
 */
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/persistence/database.module.js';
import { AdminAuthService } from './admin.auth.js';
import { AdminGuard } from './admin.guard.js';
import { AdminController } from './admin.controller.js';
import { StaffAdminController } from './staff.admin.controller.js';
import { StaffAdminService } from './staff.admin.service.js';
import { BranchesAdminController } from './branches.admin.controller.js';
import { BranchesAdminService } from './branches.admin.service.js';
import { ProceduresAdminController } from './procedures.admin.controller.js';
import { ProceduresAdminService } from './procedures.admin.service.js';
import { SlotsAdminController } from './slots.admin.controller.js';
import { SlotsAdminService } from './slots.admin.service.js';
import { AppointmentsAdminController } from './appointments.admin.controller.js';
import { AppointmentsAdminService } from './appointments.admin.service.js';
import { ReportsAdminController } from './reports.admin.controller.js';
import { ReportsAdminService } from './reports.admin.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AdminController,
    StaffAdminController,
    BranchesAdminController,
    ProceduresAdminController,
    SlotsAdminController,
    AppointmentsAdminController,
    ReportsAdminController,
  ],
  providers: [
    AdminAuthService,
    AdminGuard,
    StaffAdminService,
    BranchesAdminService,
    ProceduresAdminService,
    SlotsAdminService,
    AppointmentsAdminService,
    ReportsAdminService,
  ],
})
export class AdminModule {}
