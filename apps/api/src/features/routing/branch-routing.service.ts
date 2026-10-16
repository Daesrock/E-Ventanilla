import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { NearbyBranchesDto } from './nearby.dto.js';
import { OsrmClient } from './osrm.client.js';

@Injectable()
export class BranchRoutingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly osrm: OsrmClient,
  ) {}

  async nearby(data: NearbyBranchesDto) {
    // Los destinos provienen de sedes publicadas, nunca de coordenadas arbitrarias del cliente.
    const rows = await this.db.branch.findMany({
      where: { id: { in: data.branchIds }, active: true, published: true },
      select: { id: true, latitude: true, longitude: true },
    });
    const destinations = rows.flatMap((row) => {
      const latitude = row.latitude == null ? NaN : Number(row.latitude);
      const longitude = row.longitude == null ? NaN : Number(row.longitude);
      return Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
        ? [{ id: row.id, latitude, longitude }]
        : [];
    });
    if (!destinations.length) return { status: 'no_coordinates', items: [] };
    const routes = await this.osrm.routes(data, destinations);
    if (routes === null) return { status: 'unavailable', items: [] };
    routes.sort(
      (left, right) =>
        left.durationSeconds - right.durationSeconds || left.distanceMeters - right.distanceMeters,
    );
    return { status: 'available', travelMode: 'driving', trafficIncluded: false, items: routes };
  }
}
