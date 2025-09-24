import { config } from '@/lib/config';
import type {
  ProviderPointToPointParams,
  ProviderRoundTripParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';

function ensureBaseUrl(): string {
  if (!config.osrmUrl) {
    throw new Error('OSRM_URL er ikke satt');
  }
  return config.osrmUrl.replace(/\/$/, '');
}

function mapRoute(route: any): RouteAlternative {
  return {
    polyline: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    providerMeta: route,
  };
}

export class OsrmProvider implements RoutingProvider {
  id = 'osrm';
  supportsRoundTrip = false;

  async getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]> {
    const baseUrl = ensureBaseUrl();
    const points = [params.start, ...(params.via ?? []), params.end]
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');
    const alternatives = Math.max(params.alternatives ?? 0, 0);
    const url = `${baseUrl}/route/v1/foot/${points}?alternatives=${alternatives}&overview=full&geometries=polyline6&annotations=true`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM feilet med status ${response.status}`);
    }
    const data = (await response.json()) as { routes: any[] };
    return data.routes.map(mapRoute);
  }

  async getRoundTripRoutes(_params: ProviderRoundTripParams): Promise<RouteAlternative[]> {
    throw new Error('OSRM støtter ikke roundtrip direkte i denne implementasjonen');
  }
}

export function createOsrmProvider(): RoutingProvider {
  return new OsrmProvider();
}
