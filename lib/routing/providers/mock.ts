import type {
  ProviderPointToPointParams,
  ProviderRoundTripParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';
import { encodePolyline } from '@/lib/geo/polyline';
import {
  bearingBetween,
  destinationPoint,
  haversineDistance,
  pathLength,
} from '@/lib/geo/distance';

function buildAlternative(points: { lat: number; lng: number }[], tags: string[] = []): RouteAlternative {
  const distance = pathLength(points);
  return {
    polyline: encodePolyline(points),
    distanceMeters: distance,
    durationSeconds: (distance / 1000) * 330,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    tags,
  };
}

function createArcRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  offsetMeters: number,
): RouteAlternative {
  const heading = bearingBetween(start, end);
  const mid = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };
  const offsetPoint = destinationPoint(mid, heading + 90, offsetMeters);
  return buildAlternative([start, offsetPoint, end], ['arc']);
}

function createLoop(start: { lat: number; lng: number }, radiusMeters: number, segments = 6): RouteAlternative {
  const points = [] as { lat: number; lng: number }[];
  for (let i = 0; i <= segments; i += 1) {
    const bearing = (360 / segments) * i;
    points.push(destinationPoint(start, bearing, radiusMeters));
  }
  points.push(start);
  return buildAlternative(points, ['loop']);
}

export class MockRoutingProvider implements RoutingProvider {
  id = 'mock';
  supportsRoundTrip = true;

  async getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]> {
    const { start, end, alternatives, via } = params;
    if (via && via.length > 0) {
      return [buildAlternative([start, ...via, end], ['via'])];
    }
    const baseline = buildAlternative([start, end], ['baseline']);
    const offset = haversineDistance(start, end) * 0.3 + 300;
    const alt1 = createArcRoute(start, end, offset);
    const alt2 = createArcRoute(start, end, -offset);
    const results = [baseline];
    if (alternatives >= 1) results.push(alt1);
    if (alternatives >= 2) results.push(alt2);
    return results;
  }

  async getRoundTripRoutes(params: ProviderRoundTripParams): Promise<RouteAlternative[]> {
    const { start, targetDistanceMeters, alternatives } = params;
    const radius = targetDistanceMeters / (2 * Math.PI);
    const base = createLoop(start, radius, 12);
    const longer = createLoop(start, radius * 1.2, 14);
    const shorter = createLoop(start, radius * 0.8, 10);
    const results = [base];
    if (alternatives >= 1) results.push(longer);
    if (alternatives >= 2) results.push(shorter);
    return results;
  }
}

export function createMockProvider(): RoutingProvider {
  return new MockRoutingProvider();
}
