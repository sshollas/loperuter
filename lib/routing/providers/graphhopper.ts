import { config } from '@/lib/config';
import type {
  ProviderPointToPointParams,
  ProviderRoundTripParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';

function requireBaseUrl(): string {
  if (!config.graphhopperUrl) {
    throw new Error('GRAPHHOPPER_URL er ikke satt');
  }
  return config.graphhopperUrl.replace(/\/$/, '');
}

function mapGraphhopperRoute(route: any): RouteAlternative {
  const points = route.points_encoded ? route.points : route.points;
  const polyline = route.points ?? route.geometry ?? '';
  return {
    polyline,
    distanceMeters: route.distance,
    durationSeconds: route.time / 1000,
    elevationGainMeters: route.ascend ?? 0,
    elevationLossMeters: route.descend ?? 0,
    providerMeta: route,
  };
}

export class GraphhopperProvider implements RoutingProvider {
  id = 'graphhopper';
  supportsRoundTrip = true;

  async getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]> {
    const baseUrl = requireBaseUrl();
    const url = new URL(`${baseUrl}/route`);
    url.searchParams.set('profile', 'foot');
    url.searchParams.set('ch.disable', 'true');
    url.searchParams.set('points_encoded', 'false');
    url.searchParams.set('alternative_route.max_paths', String(Math.max(1, params.alternatives ?? 0)));
    url.searchParams.set('alternative_route.max_share_factor', '0.6');
    url.searchParams.set('alternative_route.max_weight_factor', '1.4');
    [params.start, ...(params.via ?? []), params.end].forEach((point) => {
      url.searchParams.append('point', `${point.lat},${point.lng}`);
    });
    if (params.avoidPolygonsGeoJSON) {
      url.searchParams.set('block_area', JSON.stringify(params.avoidPolygonsGeoJSON));
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Graphhopper feilet med ${response.status}`);
    }
    const data = (await response.json()) as { paths: any[] };
    return data.paths.map(mapGraphhopperRoute);
  }

  async getRoundTripRoutes(params: ProviderRoundTripParams): Promise<RouteAlternative[]> {
    const baseUrl = requireBaseUrl();
    const url = new URL(`${baseUrl}/route`);
    url.searchParams.set('profile', 'foot');
    url.searchParams.set('ch.disable', 'true');
    url.searchParams.set('points_encoded', 'false');
    url.searchParams.set('algorithm', 'round_trip');
    url.searchParams.set('round_trip.distance', String(Math.round(params.targetDistanceMeters)));
    url.searchParams.set('round_trip.seed', '7');
    url.searchParams.append('point', `${params.start.lat},${params.start.lng}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Graphhopper roundtrip feilet med ${response.status}`);
    }
    const data = (await response.json()) as { paths: any[] };
    return data.paths.slice(0, params.alternatives + 1).map(mapGraphhopperRoute);
  }
}

export function createGraphhopperProvider(): RoutingProvider {
  return new GraphhopperProvider();
}
