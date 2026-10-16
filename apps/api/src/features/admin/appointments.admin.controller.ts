/** Rutas administrativas de citas y registro de atención. */
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { CurrentAdmin, RequirePermission } from './admin.decorators.js';
import { AppointmentsAdminService } from './appointments.admin.service.js';
import type { AdminContext } from './admin.types.js';
import { AttendanceDto } from './admin.dto.js';

@Controller('admin/appointments')
@UseGuards(AdminGuard)
export class AppointmentsAdminController {
  constructor(private readonly appointments: AppointmentsAdminService) {}

  @Get()
  @RequirePermission('appointment.read')
  list(@CurrentAdmin() admin: AdminContext, @Query() query: Record<string, unknown>) {
    return this.appointments.list(admin, query);
  }

  @Post(':id/attendance')
  @RequirePermission('appointment.update')
  attendance(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AttendanceDto,
  ) {
    return this.appointments.attendance(admin, id, body);
  }
}
