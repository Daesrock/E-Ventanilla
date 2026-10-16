export interface RoutePoint {
  latitude: number;
  longitude: number;
}
export interface RouteDestination extends RoutePoint {
  id: string;
}
export interface BranchRoute {
  branchId: string;
  distanceMeters: number;
  durationSeconds: number;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Respuesta de rutas inválida.');
  return value as Record<string, unknown>;
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Solo habla con la URL configurada por el operador. No registra solicitudes ni coordenadas. */
export class OsrmClient {
  private readonly baseUrl: URL | null;
  constructor(
    baseUrl: string,
    private readonly request = fetch,
    private readonly timeoutMs = 5_000,
  ) {
    this.baseUrl = baseUrl ? new URL(baseUrl) : null;
    if (
      this.baseUrl &&
      (!['http:', 'https:'].includes(this.baseUrl.protocol) ||
        this.baseUrl.username ||
        this.baseUrl.password ||
        this.baseUrl.pathname !== '/' ||
        this.baseUrl.search ||
        this.baseUrl.hash)
    ) {
      throw new Error('Configura OSRM_BASE_URL como el origen del servicio privado.');
    }
  }

  async routes(
    origin: RoutePoint,
    destinations: RouteDestination[],
  ): Promise<BranchRoute[] | null> {
    if (!this.baseUrl) return null;
    if (!destinations.length) return [];
    const signal = AbortSignal.timeout(this.timeoutMs);
    const post = async (service: string, body: unknown) => {
      const response = await this.request(new URL(`${service}/v1/driving`, this.baseUrl!), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Servicio de rutas no disponible.');
      const result = object(await response.json());
      if (result.code !== 'Ok') throw new Error('No se obtuvo un recorrido.');
      return result;
    };
    try {
      const points = [origin, ...destinations].map((point) => [point.longitude, point.latitude]);
      // Limita el ajuste a la carretera: no enlazar un punto fuera de cobertura con una vía lejana.
      const nearest = await post('nearest', {
        coordinates: points,
        number: 1,
        radiuses: [5_000, ...destinations.map(() => 250)],
        generate_hints: false,
      });
      if (!Array.isArray(nearest.waypoints) || nearest.waypoints.length !== points.length)
        return null;
      const snapped = nearest.waypoints.map((entry, index) => {
        if (!Array.isArray(entry) || !entry.length) return null;
        const waypoint = object(entry[0]);
        const location = waypoint.location;
        if (
          !nonnegative(waypoint.distance) ||
          waypoint.distance > (index === 0 ? 5_000 : 250) ||
          !Array.isArray(location) ||
          location.length !== 2 ||
          !location.every((value) => typeof value === 'number' && Number.isFinite(value))
        )
          return null;
        const [longitude, latitude] = location as [number, number];
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
          ? location
          : null;
      });
      if (!snapped[0]) return [];
      const valid = destinations
        .map((destination, index) => ({ destination, point: snapped[index + 1] }))
        .filter((entry) => entry.point);
      if (!valid.length) return [];
      const table = await post('table', {
        coordinates: [snapped[0], ...valid.map((entry) => entry.point)],
        sources: [0],
        destinations: valid.map((_, index) => index + 1),
        annotations: ['duration', 'distance'],
        skip_waypoints: true,
      });
      // Nunca convertir una ruta ausente en una estimación en línea recta.
      if (Array.isArray(table.fallback_speed_cells) && table.fallback_speed_cells.length)
        return null;
      const distances = Array.isArray(table.distances) ? table.distances[0] : null;
      const durations = Array.isArray(table.durations) ? table.durations[0] : null;
      if (
        !Array.isArray(distances) ||
        !Array.isArray(durations) ||
        distances.length !== valid.length ||
        durations.length !== valid.length
      )
        return null;
      return valid.flatMap((entry, index) => {
        const distanceMeters = distances[index],
          durationSeconds = durations[index];
        return nonnegative(distanceMeters) && nonnegative(durationSeconds)
          ? [{ branchId: entry.destination.id, distanceMeters, durationSeconds }]
          : [];
      });
    } catch {
      return null;
    }
  }
}
