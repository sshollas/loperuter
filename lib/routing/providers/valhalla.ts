import { config } from '@/lib/config';
import type {
  ProviderPointToPointParams,
  ProviderRoundTripParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';

function requireBaseUrl(): string {
  if (!config.valhallaUrl) {
    throw new Error('VALHALLA_URL er ikke satt');
  }
  return config.valhallaUrl.replace(/\/$/, '');
}

function mapValhallaRoute(route: any): RouteAlternative {
  const summary = route.summary ?? route.trip?.summary;
  return {
    polyline: route.shape ?? route.trip?.legs?.[0]?.shape ?? '',
    distanceMeters: (summary?.length ?? 0) * 1000,
    durationSeconds: summary?.time,
    elevationGainMeters: summary?.ascent ?? 0,
    elevationLossMeters: summary?.descent ?? 0,
    providerMeta: route,
  };
}

export class ValhallaProvider implements RoutingProvider {
  id = 'valhalla';
  supportsRoundTrip = true;

  async getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]> {
    const baseUrl = requireBaseUrl();
    const locations = [params.start, ...(params.via ?? []), params.end].map((p) => ({ lon: p.lng, lat: p.lat }));
    const body: any = {
      locations,
      costing: 'pedestrian',
    };
    if (!params.via || params.via.length === 0) {
      body.alternates = Math.max(0, params.alternatives);
    }
    const response = await fetch(`${baseUrl}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Valhalla feilet med ${response.status}`);
    }
    const data = (await response.json()) as { trip?: any; alternates?: any[] };
    const routes: RouteAlternative[] = [];
    if (data.trip) {
      routes.push(mapValhallaRoute({ ...data.trip, shape: data.trip.legs?.map((leg: any) => leg.shape).join('') }));
    }
    if (data.alternates) {
      data.alternates.forEach((alt) => routes.push(mapValhallaRoute(alt)));
    }
    return routes;
  }

  async getRoundTripRoutes(params: ProviderRoundTripParams): Promise<RouteAlternative[]> {
    const baseUrl = requireBaseUrl();
    const body = {
      locations: [{ lat: params.start.lat, lon: params.start.lng }],
      costing: 'pedestrian',
      directions_options: { units: 'kilometers' },
      parameters: { maximum_distance: params.targetDistanceMeters / 1000 },
    };
    const response = await fetch(`${baseUrl}/optimized_route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Valhalla roundtrip feilet med ${response.status}`);
    }
    const data = (await response.json()) as { trip?: any };
    if (!data.trip) return [];
    return [mapValhallaRoute({ ...data.trip, shape: data.trip.legs?.map((leg: any) => leg.shape).join('') })];
  }
}

export function createValhallaProvider(): RoutingProvider {
  return new ValhallaProvider();
}
