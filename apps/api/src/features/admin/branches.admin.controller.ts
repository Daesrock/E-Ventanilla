/** Rutas administrativas de sedes: CRUD, responsable y oferta de trámites. */
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
import { BranchesAdminService } from './branches.admin.service.js';
import type { AdminContext } from './admin.types.js';
import { BranchCreateDto, BranchHeadDto, BranchUpdateDto, OfferUpdateDto } from './admin.dto.js';

@Controller('admin/branches')
@UseGuards(AdminGuard)
export class BranchesAdminController {
  constructor(private readonly branches: BranchesAdminService) {}

  @Get()
  @RequirePermission('branch.read')
  list(@CurrentAdmin() admin: AdminContext, @Query() query: Record<string, unknown>) {
    return this.branches.list(admin, query);
  }

  @Post()
  @RequirePermission('branch.create')
  create(@CurrentAdmin() admin: AdminContext, @Body() body: BranchCreateDto) {
    return this.branches.create(admin, body);
  }

  @Patch(':id')
  @RequirePermission('branch.update')
  update(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: BranchUpdateDto,
  ) {
    return this.branches.update(admin, id, body);
  }

  @Patch(':id/head')
  @RequirePermission('branch.update')
  assignHead(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: BranchHeadDto,
  ) {
    return this.branches.assignHead(admin, id, body);
  }

  @Get(':id/procedures')
  @RequirePermission('branch.read')
  offers(@CurrentAdmin() admin: AdminContext, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.branches.offersFor(admin, id);
  }

  @Patch(':id/procedures')
  @RequirePermission('offer.manage')
  updateOffers(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: OfferUpdateDto,
  ) {
    return this.branches.updateOffers(admin, id, body);
  }
}
