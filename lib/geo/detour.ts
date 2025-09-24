import type { Polygon, MultiPolygon } from 'geojson';
import type {
  DetourCandidate,
  LatLng,
  ProviderPointToPointParams,
  RouteAlternative,
  RoutingProvider,
} from '@/lib/routing/types';
import { decodePolyline } from '@/lib/geo/polyline';
import {
  destinationPoint,
  pathLength,
  sampleAlong,
} from '@/lib/geo/distance';

export interface DetourGenerationOptions {
  sampleCount?: number;
  bearingCount?: number;
  minRadiusRatio?: number;
  maxRadiusRatio?: number;
}

const DEFAULT_FRACTIONS = [0.2, 0.5, 0.8];

export function generateViaCandidates(
  baselinePolyline: string,
  missingDistance: number,
  options: DetourGenerationOptions = {},
): DetourCandidate[] {
  if (missingDistance <= 0) return [];
  const points = decodePolyline(baselinePolyline);
  if (points.length < 2) return [];
  const totalLength = pathLength(points);
  const {
    sampleCount = 3,
    bearingCount = 8,
    minRadiusRatio = 0.25,
    maxRadiusRatio = 1.0,
  } = options;

  const fractions = sampleCount === 3 ? DEFAULT_FRACTIONS : Array.from({ length: sampleCount }, (_, i) => (i + 1) / (sampleCount + 1));
  const bearings = Array.from({ length: bearingCount }, (_, i) => (360 / bearingCount) * i);
  const minRadius = Math.max(missingDistance * minRadiusRatio, 200);
  const maxRadius = Math.max(missingDistance * maxRadiusRatio, minRadius + 100);
  const radius = (minRadius + maxRadius) / 2;

  const candidates: DetourCandidate[] = [];
  fractions.forEach((fraction, fractionIndex) => {
    const anchor = sampleAlong(points, totalLength * fraction);
    bearings.forEach((bearing) => {
      const initialVia = destinationPoint(anchor, bearing, radius);
      candidates.push({
        anchor,
        radiusMeters: radius,
        bearing,
        anchorIndex: fractionIndex,
        initialVia,
      });
    });
  });
  return candidates;
}

async function requestViaRoute(
  provider: RoutingProvider,
  params: ProviderPointToPointParams,
  viaPoint: LatLng,
): Promise<RouteAlternative | null> {
  try {
    const result = await provider.getPointToPointRoutes({
      ...params,
      via: [viaPoint],
      alternatives: 0,
    });
    return result[0] ?? null;
  } catch (error) {
    console.warn('Via route failed', error);
    return null;
  }
}

export interface DetourExecutionOptions extends DetourGenerationOptions {
  toleranceMeters: number;
  avoidPolygonsGeoJSON?: Polygon | MultiPolygon;
  maxCandidates?: number;
}

export async function generateDetourAlternatives(
  provider: RoutingProvider,
  baseline: RouteAlternative,
  params: ProviderPointToPointParams,
  targetDistance: number,
  tolerance: number,
  options: Partial<DetourExecutionOptions> = {},
): Promise<RouteAlternative[]> {
  const missingDistance = Math.max(0, targetDistance - baseline.distanceMeters);
  if (missingDistance <= tolerance) {
    return [];
  }

  const executionOptions: DetourExecutionOptions = {
    toleranceMeters: tolerance,
    maxCandidates: 8,
    ...options,
  };

  const seeds = generateViaCandidates(baseline.polyline, missingDistance, executionOptions).slice(
    0,
    executionOptions.maxCandidates,
  );

  const alternatives: RouteAlternative[] = [];

  for (const seed of seeds) {
    let low = Math.max(seed.radiusMeters * 0.5, missingDistance * 0.25);
    let high = Math.max(seed.radiusMeters * 1.5, missingDistance * 1.25);
    let best: RouteAlternative | null = null;
    for (let iteration = 0; iteration < 7; iteration += 1) {
      const radius = (low + high) / 2;
      const via = destinationPoint(seed.anchor, seed.bearing, radius);
      const route = await requestViaRoute(provider, params, via);
      if (!route) break;
      const diff = route.distanceMeters - targetDistance;
      if (Math.abs(diff) <= executionOptions.toleranceMeters) {
        best = route;
        break;
      }
      if (diff > 0) {
        high = radius;
      } else {
        low = radius;
      }
      best = route;
    }
    if (best) {
      alternatives.push(best);
    }
  }

  return alternatives;
}
