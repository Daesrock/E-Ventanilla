import { UseFilters } from '@nestjs/common';
import { AdminDatabaseErrors } from './admin.database-errors.js';
/** Rutas administrativas de reportes y exportación CSV con el mismo alcance. */
import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from './admin.guard.js';
import { CurrentAdmin, RequirePermission } from './admin.decorators.js';
import { ReportsAdminService } from './reports.admin.service.js';
import type { AdminContext } from './admin.types.js';

@Controller('admin/reports')
@UseGuards(AdminGuard)
@UseFilters(AdminDatabaseErrors)
export class ReportsAdminController {
  constructor(private readonly reports: ReportsAdminService) {}

  @Get()
  @RequirePermission('report.read')
  report(@CurrentAdmin() admin: AdminContext, @Query() query: Record<string, unknown>) {
    return this.reports.report(admin, query);
  }

  @Get('export.csv')
  @RequirePermission('report.read')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @CurrentAdmin() admin: AdminContext,
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.reports.exportCsv(admin, query);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return result.body;
  }
}
