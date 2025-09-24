import { config } from '@/lib/config';
import type {
  ProviderPointToPointParams,
  ProviderRoundTripParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';

function requireApiKey(): string {
  if (!config.orsApiKey) {
    throw new Error('ORS_API_KEY mangler');
  }
  return config.orsApiKey;
}

function mapOrsRoute(route: any): RouteAlternative {
  return {
    polyline: route.geometry,
    distanceMeters: route.summary.distance,
    durationSeconds: route.summary.duration,
    elevationGainMeters: route.summary.ascent ?? 0,
    elevationLossMeters: route.summary.descent ?? 0,
    providerMeta: route,
  };
}

export class OrsProvider implements RoutingProvider {
  id = 'ors';
  supportsRoundTrip = true;

  async getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]> {
    const apiKey = requireApiKey();
    const body: any = {
      coordinates: [params.start, ...(params.via ?? []), params.end].map((p) => [p.lng, p.lat]),
      preference: 'recommended',
      elevation: true,
      options: {},
    };
    if (!params.via || params.via.length === 0) {
      body.alternative_routes = {
        target_count: Math.max(1, params.alternatives ?? 0),
        share_factor: 0.6,
        weight_factor: 1.4,
      };
    }
    if (params.avoidPolygonsGeoJSON) {
      body.options.avoid_polygons = params.avoidPolygonsGeoJSON;
    }
    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`ORS directions feilet med ${response.status}`);
    }
    const data = (await response.json()) as { routes: any[] };
    return data.routes.map(mapOrsRoute);
  }

  async getRoundTripRoutes(params: ProviderRoundTripParams): Promise<RouteAlternative[]> {
    const apiKey = requireApiKey();
    const payload = {
      coordinates: [[params.start.lng, params.start.lat]],
      round_trip: {
        length: params.targetDistanceMeters,
        points: 3,
        seed: 7,
      },
    };
    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`ORS round trip feilet med ${response.status}`);
    }
    const data = (await response.json()) as { routes: any[] };
    return data.routes.slice(0, params.alternatives + 1).map(mapOrsRoute);
  }
}

export function createOrsProvider(): RoutingProvider {
  return new OrsProvider();
}
