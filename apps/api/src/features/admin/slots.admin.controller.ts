/** Rutas administrativas de horarios y cupos por sede. */
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
import { SlotsAdminService } from './slots.admin.service.js';
import type { AdminContext } from './admin.types.js';
import { SlotCreateDto, SlotUpdateDto } from './admin.dto.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class SlotsAdminController {
  constructor(private readonly slots: SlotsAdminService) {}

  @Get('branches/:branchId/time-slots')
  @RequirePermission('slot.read')
  list(
    @CurrentAdmin() admin: AdminContext,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.slots.list(admin, branchId, query);
  }

  @Post('branches/:branchId/time-slots')
  @RequirePermission('slot.create')
  create(
    @CurrentAdmin() admin: AdminContext,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Body() body: SlotCreateDto,
  ) {
    return this.slots.create(admin, branchId, body);
  }

  @Patch('time-slots/:id')
  @RequirePermission('slot.update')
  update(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SlotUpdateDto,
  ) {
    return this.slots.update(admin, id, body);
  }
}
