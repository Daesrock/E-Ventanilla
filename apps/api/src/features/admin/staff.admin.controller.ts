/** Rutas administrativas de personal: consulta, alta de jefes y actualización. */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { CurrentAdmin, RequirePermission } from './admin.decorators.js';
import { StaffAdminService } from './staff.admin.service.js';
import type { AdminContext } from './admin.types.js';
import { StaffCreateDto, StaffUpdateDto } from './admin.dto.js';

@Controller('admin/staff')
@UseGuards(AdminGuard)
export class StaffAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @Get()
  @RequirePermission('staff.read')
  list(@Query() query: Record<string, unknown>) {
    return this.staff.list(query);
  }

  @Post()
  @RequirePermission('staff.create')
  create(@CurrentAdmin() admin: AdminContext, @Body() body: StaffCreateDto) {
    return this.staff.create(admin, body);
  }

  @Patch(':id')
  @RequirePermission('staff.update')
  update(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: StaffUpdateDto,
  ) {
    return this.staff.update(admin, id, body);
  }
}
