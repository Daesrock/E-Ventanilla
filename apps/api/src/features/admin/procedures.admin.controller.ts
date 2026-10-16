/** Rutas administrativas del catálogo central de trámites. */
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
import { ProceduresAdminService } from './procedures.admin.service.js';
import type { AdminContext } from './admin.types.js';
import { ProcedureCreateDto, ProcedureUpdateDto } from './admin.dto.js';

@Controller('admin/procedures')
@UseGuards(AdminGuard)
export class ProceduresAdminController {
  constructor(private readonly procedures: ProceduresAdminService) {}

  @Get()
  @RequirePermission('procedure.read')
  list(@Query() query: Record<string, unknown>) {
    return this.procedures.list(query);
  }

  @Post()
  @RequirePermission('procedure.create')
  create(@CurrentAdmin() admin: AdminContext, @Body() body: ProcedureCreateDto) {
    return this.procedures.create(admin, body);
  }

  @Patch(':id')
  @RequirePermission('procedure.update')
  update(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ProcedureUpdateDto,
  ) {
    return this.procedures.update(admin, id, body);
  }
}
