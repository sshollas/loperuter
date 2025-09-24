import { config, isMockRouting } from '@/lib/config';
import { createGeocoder, resolveLocation } from '@/lib/geo/geocode';
import { computeBounds, computeCenter } from '@/lib/geo/distance';
import { decodePolyline } from '@/lib/geo/polyline';
import { computeOverlapRatio } from '@/lib/geo/overlap';
import { generateDetourAlternatives } from '@/lib/geo/detour';
import { getElevationService } from '@/lib/elevation';
import type {
  ElevPref,
  PointToPointRequest,
  ProviderFactory,
  ProviderPointToPointParams,
  RouteAlternative,
  RouteRequestBase,
  RouteResponse,
  RoundTripRequest,
} from '@/lib/routing/types';
import { createMockProvider } from '@/lib/routing/providers/mock';
import { createOsrmProvider } from '@/lib/routing/providers/osrm';
import { createOrsProvider } from '@/lib/routing/providers/ors';
import { createValhallaProvider } from '@/lib/routing/providers/valhalla';
import { createGraphhopperProvider } from '@/lib/routing/providers/graphhopper';

const providerFactories: Record<string, ProviderFactory> = {
  mock: createMockProvider,
  osrm: createOsrmProvider,
  ors: createOrsProvider,
  valhalla: createValhallaProvider,
  graphhopper: createGraphhopperProvider,
};

let providerCache: ReturnType<ProviderFactory> | null = null;

function getProvider() {
  if (!providerCache) {
    const factory = providerFactories[config.routingProvider] ?? createMockProvider;
    providerCache = factory();
  }
  return providerCache;
}

function ensureTolerance(request: RouteRequestBase): number {
  return request.distanceToleranceMeters ?? 100;
}

const COST_WEIGHTS: Record<ElevPref, { wd: number; we: number; wo: number }> = {
  min: { wd: 1, we: 0.5, wo: 1 },
  balanced: { wd: 1, we: 1, wo: 1 },
  max: { wd: 1, we: -1, wo: 1 },
};

export function calculateCost(
  alternative: RouteAlternative,
  targetDistance: number,
  preferElevation: ElevPref,
): number {
  const weights = COST_WEIGHTS[preferElevation] ?? COST_WEIGHTS.balanced;
  const distDev = Math.abs(alternative.distanceMeters - targetDistance);
  const overlap = alternative.overlapRatio ?? 0;
  const elev = alternative.elevationGainMeters ?? 0;
  return weights.wd * distDev + weights.we * elev + weights.wo * overlap * 1000;
}

function dedupeAlternatives(alternatives: RouteAlternative[]): RouteAlternative[] {
  const seen = new Map<string, RouteAlternative>();
  alternatives.forEach((alt) => {
    if (!alt.polyline) return;
    if (!seen.has(alt.polyline)) {
      seen.set(alt.polyline, alt);
    } else {
      const existing = seen.get(alt.polyline)!;
      seen.set(alt.polyline, {
        ...existing,
        providerMeta: alt.providerMeta ?? existing.providerMeta,
      });
    }
  });
  return Array.from(seen.values());
}

async function enrichElevation(alternatives: RouteAlternative[]): Promise<RouteAlternative[]> {
  const elevationService = getElevationService();
  const enriched = await Promise.all(
    alternatives.map(async (alt) => {
      const totals = await elevationService.getTotals(alt.polyline);
      const profile = await elevationService.getProfile(alt.polyline);
      return {
        ...alt,
        elevationGainMeters: totals.gain,
        elevationLossMeters: totals.loss,
        elevationProfile: profile,
      };
    }),
  );
  return enriched;
}

function annotateOverlap(baseline: RouteAlternative | null, alternatives: RouteAlternative[]): RouteAlternative[] {
  if (!baseline) return alternatives;
  return alternatives.map((alt, index) => ({
    ...alt,
    overlapRatio: index === 0 ? 0 : computeOverlapRatio(baseline.polyline, alt.polyline),
  }));
}

export function rankAlternatives(
  alternatives: RouteAlternative[],
  targetDistance: number,
  preferElevation: ElevPref,
): RouteAlternative[] {
  return [...alternatives].sort((a, b) => {
    const costA = calculateCost(a, targetDistance, preferElevation);
    const costB = calculateCost(b, targetDistance, preferElevation);
    if (costA !== costB) return costA - costB;
    if (preferElevation === 'max' && a.elevationGainMeters !== b.elevationGainMeters) {
      return b.elevationGainMeters - a.elevationGainMeters;
    }
    if (preferElevation === 'min' && a.elevationGainMeters !== b.elevationGainMeters) {
      return a.elevationGainMeters - b.elevationGainMeters;
    }
    const overlapA = a.overlapRatio ?? 0;
    const overlapB = b.overlapRatio ?? 0;
    if (overlapA !== overlapB) return overlapA - overlapB;
    return Math.abs(a.distanceMeters - targetDistance) - Math.abs(b.distanceMeters - targetDistance);
  });
}

function limitOverlap(
  baseline: RouteAlternative,
  alternatives: RouteAlternative[],
  threshold = 0.6,
  minKeep = 3,
): RouteAlternative[] {
  const kept: RouteAlternative[] = [];
  for (const alt of alternatives) {
    if (kept.length < minKeep) {
      kept.push(alt);
      continue;
    }
    if ((alt.overlapRatio ?? 0) <= threshold) {
      kept.push(alt);
    }
  }
  if (!kept.includes(baseline)) {
    kept.unshift(baseline);
  }
  return dedupeAlternatives(kept);
}

function computeGeometry(alternatives: RouteAlternative[]) {
  const points = alternatives.flatMap((alt) => decodePolyline(alt.polyline));
  if (!points.length) {
    return { center: { lat: 0, lng: 0 }, bounds: [[0, 0], [0, 0]] as [[number, number], [number, number]] };
  }
  const bounds = computeBounds(points);
  const center = computeCenter(points);
  return { center, bounds };
}

async function resolvePointOrThrow(geocoder: ReturnType<typeof createGeocoder>,
  value: { lat?: number; lng?: number } | undefined,
  address?: string,
  fallbackLabel?: string,
) {
  const resolved = await resolveLocation(geocoder, value, address);
  if (!resolved) {
    throw new Error(`Kunne ikke finne koordinater for ${fallbackLabel ?? 'punkt'}`);
  }
  return resolved;
}

export async function planPointToPointRoute(request: PointToPointRequest): Promise<RouteResponse> {
  const provider = getProvider();
  const geocoder = createGeocoder();
  const tolerance = ensureTolerance(request);
  const targetDistance = request.targetDistanceMeters;
  const start = await resolvePointOrThrow(geocoder, request.start, request.startAddress, 'start');
  const end = await resolvePointOrThrow(geocoder, request.end, request.endAddress, 'slutt');

  const providerParams: ProviderPointToPointParams = {
    start,
    end,
    alternatives: 2,
    avoidPolygonsGeoJSON: request.avoidPolygonsGeoJSON,
  };
  const initialRoutes = await provider.getPointToPointRoutes(providerParams);
  const baseline = initialRoutes[0] ?? null;

  let allAlternatives = dedupeAlternatives(initialRoutes);

  if (baseline && targetDistance > baseline.distanceMeters + tolerance) {
    const detours = await generateDetourAlternatives(
      provider,
      baseline,
      { ...providerParams, alternatives: 0 },
      targetDistance,
      tolerance,
      {
        maxCandidates: 10,
      },
    );
    allAlternatives = dedupeAlternatives([...allAlternatives, ...detours]);
  }

  const enriched = await enrichElevation(allAlternatives);
  const annotated = annotateOverlap(baseline ?? enriched[0] ?? null, enriched);
  const filtered = baseline ? limitOverlap(baseline, annotated) : annotated;
  const ranked = rankAlternatives(filtered, targetDistance, request.preferElevation ?? 'balanced');
  const top = ranked.slice(0, 5);
  const geometry = computeGeometry(top);
  const notes = [] as string[];
  if (isMockRouting) {
    notes.push('Mock-ruteleverandør er aktiv. Dataene er syntetiske.');
  }
  return {
    alternatives: top,
    center: geometry.center,
    bounds: geometry.bounds,
    notes,
  };
}

export async function planRoundTripRoute(request: RoundTripRequest): Promise<RouteResponse> {
  const provider = getProvider();
  const geocoder = createGeocoder();
  const tolerance = ensureTolerance(request);
  const targetDistance = request.targetDistanceMeters;
  const start = await resolvePointOrThrow(geocoder, request.start, request.startAddress, 'start');

  let routes: RouteAlternative[] = [];
  if (provider.supportsRoundTrip) {
    routes = await provider.getRoundTripRoutes({
      start,
      targetDistanceMeters: targetDistance,
      alternatives: 3,
      avoidPolygonsGeoJSON: request.avoidPolygonsGeoJSON,
    });
  }
  if (routes.length === 0) {
    // fallback heuristic: generate a simple loop using mock provider logic
    const mock = createMockProvider();
    routes = await mock.getRoundTripRoutes({
      start,
      targetDistanceMeters: targetDistance,
      alternatives: 3,
    });
  }

  const enriched = await enrichElevation(routes);
  const annotated = annotateOverlap(enriched[0], enriched);
  const ranked = rankAlternatives(annotated, targetDistance, request.preferElevation ?? 'balanced');
  const top = ranked.slice(0, 5);
  const geometry = computeGeometry(top);
  const notes = [] as string[];
  if (isMockRouting) {
    notes.push('Mock-ruteleverandør er aktiv. Dataene er syntetiske.');
  }
  return {
    alternatives: top,
    center: geometry.center,
    bounds: geometry.bounds,
    notes,
  };
}
