import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PublicCatalogService } from './public-catalog.service.js';

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}
  @Get('branches') branches(@Query('q') query?: unknown) {
    return this.catalog.branches(query);
  }
  @Get('branches/:id') branch(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalog.branch(id);
  }
  @Get('branches/:id/procedures') branchProcedures(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalog.branchProcedures(id);
  }
  @Get('procedures') procedures(@Query('q') query?: unknown) {
    return this.catalog.procedures(query);
  }
  @Get('procedures/:id') procedure(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalog.procedure(id);
  }
}
