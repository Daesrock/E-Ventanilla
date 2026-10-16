import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BranchRoutingService } from './branch-routing.service.js';
import { NearbyBranchesDto } from './nearby.dto.js';

@Controller('catalog/branches')
export class BranchRoutingController {
  constructor(private readonly routing: BranchRoutingService) {}

  @Post('nearby')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  nearby(@Body() data: NearbyBranchesDto) {
    return this.routing.nearby(data);
  }
}
