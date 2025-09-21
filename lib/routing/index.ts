import polyline from "@mapbox/polyline";
import { createGeocodingService, GeocodingService } from "@/lib/geo/geocode";
import {
  computeBounds,
  centroid,
  decodePolyline,
  destinationPoint,
  hashPath,
  bearingBetween,
} from "@/lib/geo/utils";
import {
  computePathLength,
  cumulativeDistances,
  haversineDistance,
  interpolatePoint,
} from "@/lib/geo/distance";
import {
  createElevationService,
  ElevationService,
} from "@/lib/elevation/index";
import type {
  PointToPointRequest,
  RouteAlternative,
  RouteResponse,
  RoundTripRequest,
  RouteKilometerMarker,
  RouteSegment,
} from "@/types/route";
import { MockRoutingProvider } from "./providers/mock";
import { OrsRoutingProvider } from "./providers/ors";
import { OsrmRoutingProvider } from "./providers/osrm";
import type { RoutingProvider, RoutingProviderRoute } from "./types";

function createRoutingProvider(): RoutingProvider {
  const provider = process.env.ROUTING_PROVIDER?.toLowerCase() ?? "osrm";
  if (provider === "mock") {
    return new MockRoutingProvider();
  }
  if (provider === "ors") {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      throw new Error("ORS_API_KEY kreves for ORS");
    }
    return new OrsRoutingProvider(apiKey);
  }
  if (provider === "osrm") {
    const osrmBaseUrl = process.env.OSRM_BASE_URL;
    return new OsrmRoutingProvider({
      baseUrl: osrmBaseUrl,
      profile: process.env.OSRM_PROFILE,
    });
  }
  console.warn(
    `Ukjent ROUTING_PROVIDER='${provider}', faller tilbake til OSRM`,
  );
  return new OsrmRoutingProvider({
    baseUrl: process.env.OSRM_BASE_URL,
    profile: process.env.OSRM_PROFILE,
  });
}

const DEFAULT_TOLERANCE = 100;
const DEFAULT_PACE_SECONDS_PER_KM = Number.parseFloat(
  process.env.DEFAULT_PACE_SECONDS_PER_KM ?? `${5 * 60 + 30}`,
);

interface PlanningDependencies {
  routing: RoutingProvider;
  geocoder: GeocodingService;
  elevation: ElevationService;
}

function createDependencies(): PlanningDependencies {
  return {
    routing: createRoutingProvider(),
    geocoder: createGeocodingService(),
    elevation: createElevationService(),
  };
}

export async function planRoundTrip(
  request: RoundTripRequest,
  deps = createDependencies(),
): Promise<RouteResponse> {
  const { routing, geocoder, elevation } = deps;
  const tolerance = request.distanceToleranceMeters ?? DEFAULT_TOLERANCE;
  const preferElevation = request.preferElevation ?? "balanced";
  const start = await resolvePoint(request.start, request.startAddress, geocoder);

  const target = request.targetDistanceMeters;
  const notes: string[] = [];
  const candidates: RouteCandidate[] = [];

  if (routing.getRoundTrip) {
    const seeds = [1, 777, 2024, 1337, 99];
    for (const seed of seeds) {
      try {
        const routes = await routing.getRoundTrip(start, { length: target, seed });
        routes.forEach((route) =>
          candidates.push({
            route,
            kind: "provider",
            label: `roundtrip-${seed}`,
          }),
        );
      } catch (error) {
        notes.push(`Roundtrip (seed ${seed}) feilet: ${(error as Error).message}`);
      }
    }
  }

  if (candidates.length === 0) {
    const bearings = Array.from({ length: 8 }, (_, i) => i * 45);
    for (const bearing of bearings) {
      const candidate = await roundTripBinarySearch({
        routing,
        start,
        bearing,
        target,
        tolerance,
      });
      if (candidate) {
        candidates.push({ route: candidate, kind: "constructed", label: `bearing-${bearing}` });
      }
    }
  }

  const enriched = await enrichCandidates(candidates, elevation);
  if (enriched.length === 0) {
    throw new Error("Fant ingen gyldige rundtur-alternativer");
  }

  const unique = dedupeRoutes(enriched);
  const sorted = sortAlternatives(unique, preferElevation, target);

  const top = sorted.slice(0, 5);
  const focusPoints = top.flatMap((alt) => decodePolyline(alt.polyline));
  const center = centroid(focusPoints);
  const bounds = computeBounds(focusPoints);
  return {
    alternatives: top,
    center,
    bounds,
    notes,
  };
}

export async function planPointToPoint(
  request: PointToPointRequest,
  deps = createDependencies(),
): Promise<RouteResponse> {
  const { routing, geocoder, elevation } = deps;
  const tolerance = request.distanceToleranceMeters ?? DEFAULT_TOLERANCE;
  const preferElevation = request.preferElevation ?? "balanced";
  const start = await resolvePoint(request.start, request.startAddress, geocoder);
  const end = await resolvePoint(request.end, request.endAddress, geocoder);

  const baselineRoutes = await routing.getRouteBetween([start, end], {
    alternatives: 3,
  });
  if (baselineRoutes.length === 0) {
    throw new Error("Kunne ikke finne basisrute mellom punktene");
  }
  const baseline = baselineRoutes[0];
  const baselineDistance = baseline.distanceMeters;
  const target = request.targetDistanceMeters;
  const delta = target - baselineDistance;

  const candidates: RouteCandidate[] = baselineRoutes.map((route, index) => ({
    route,
    kind: index === 0 ? "baseline" : "provider-alt",
    label: `baseline-${index}`,
  }));

  if (delta > tolerance) {
    const detourCandidates = await buildDetourCandidates({
      routing,
      baseline,
      target,
      tolerance,
    });
    candidates.push(...detourCandidates);
  }

  const enriched = await enrichCandidates(candidates, elevation);
  const unique = dedupeRoutes(enriched);
  const sorted = sortAlternatives(unique, preferElevation, target);
  const top = sorted.slice(0, 5);
  const focusPoints = top.flatMap((alt) => decodePolyline(alt.polyline));
  return {
    alternatives: top,
    center: centroid(focusPoints),
    bounds: computeBounds(focusPoints),
    notes: [],
  };
}

async function resolvePoint(
  provided: { lat: number; lng: number } | undefined,
  address: string | undefined,
  geocoder: GeocodingService,
) {
  if (provided) return provided;
  if (!address) {
    throw new Error("Koordinater eller adresse må oppgis");
  }
  const result = await geocoder.geocode(address);
  return { lat: result.lat, lng: result.lng };
}

interface RouteCandidate {
  route: RoutingProviderRoute;
  kind: string;
  label: string;
}

async function roundTripBinarySearch({
  routing,
  start,
  bearing,
  target,
  tolerance,
}: {
  routing: RoutingProvider;
  start: { lat: number; lng: number };
  bearing: number;
  target: number;
  tolerance: number;
}): Promise<RoutingProviderRoute | null> {
  let low = target / 4;
  let high = target;
  let best: { route: RoutingProviderRoute; delta: number } | null = null;
  for (let i = 0; i < 6; i += 1) {
    const radius = (low + high) / 2;
    const pivot = destinationPoint(start, bearing, radius);
    const routes = await routing.getRouteBetween([start, pivot, start]);
    if (!routes[0]) {
      break;
    }
    const route = routes[0];
    const delta = Math.abs(route.distanceMeters - target);
    if (!best || delta < best.delta) {
      best = { route, delta };
    }
    if (route.distanceMeters < target) {
      low = radius;
    } else {
      high = radius;
    }
    if (delta <= tolerance) {
      break;
    }
  }
  return best?.route ?? null;
}

async function enrichCandidates(
  candidates: RouteCandidate[],
  elevation: ElevationService,
): Promise<RouteAlternative[]> {
  const seen = new Set<string>();
  const enriched: RouteAlternative[] = [];
  for (const candidate of candidates) {
    const signature = hashPath(candidate.route.coordinates);
    if (seen.has(signature)) continue;
    seen.add(signature);
    const profile = await elevation.getProfile(candidate.route.polyline);
    const totals = elevation.getTotals(profile);
    const annotations = buildRouteAnnotations(candidate.route.coordinates);
    const alternative: RouteAlternative = {
      polyline: candidate.route.polyline,
      distanceMeters: candidate.route.distanceMeters,
      elevationGainMeters: totals.gain,
      elevationLossMeters: totals.loss,
      estimatedTimeSeconds:
        (candidate.route.distanceMeters / 1000) * DEFAULT_PACE_SECONDS_PER_KM,
      elevationProfile: profile.map((point) => ({
        distance: point.d,
        elevation: point.z,
      })),
      kilometerMarkers: annotations.markers,
      segments: annotations.segments,
      providerMeta: { kind: candidate.kind, label: candidate.label },
    };
    enriched.push(alternative);
  }
  return enriched;
}

function dedupeRoutes(alternatives: RouteAlternative[]): RouteAlternative[] {
  const unique = new Map<string, RouteAlternative>();
  alternatives.forEach((alt) => {
    const signature = hashPath(decodePolyline(alt.polyline));
    if (!unique.has(signature)) {
      unique.set(signature, alt);
    }
  });
  return Array.from(unique.values());
}

function buildRouteAnnotations(
  path: { lat: number; lng: number }[],
): { markers: RouteKilometerMarker[]; segments: RouteSegment[] } {
  if (path.length === 0) {
    return { markers: [], segments: [] };
  }

  const distances = cumulativeDistances(path);
  const total = distances[distances.length - 1] ?? 0;

  const points: { distance: number; coord: { lat: number; lng: number } }[] = [
    { distance: 0, coord: path[0] },
  ];

  for (let d = 1000; d < total; d += 1000) {
    points.push({ distance: d, coord: interpolatePoint(path, distances, d) });
  }

  if (total > 0) {
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.abs(lastPoint.distance - total) > 1) {
      points.push({ distance: total, coord: path[path.length - 1] });
    }
  }

  const markers: RouteKilometerMarker[] = points.map((point, index) => ({
    distanceMeters: point.distance,
    coordinate: point.coord,
    label:
      index === 0
        ? "Start"
        : index === points.length - 1
          ? "Mål"
          : `${(point.distance / 1000).toFixed(0)} km`,
  }));

  const segments: RouteSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const length = Math.max(0, end.distance - start.distance);
    if (length < 10) {
      continue;
    }
    const heading = bearingBetween(start.coord, end.coord);
    segments.push({
      startDistanceMeters: start.distance,
      endDistanceMeters: end.distance,
      lengthMeters: length,
      headingDegrees: Number.isFinite(heading) ? heading : 0,
    });
  }

  return { markers, segments };
}

function sortAlternatives(
  alternatives: RouteAlternative[],
  preference: "min" | "max" | "balanced",
  target: number,
): RouteAlternative[] {
  if (alternatives.length <= 1) return alternatives;
  const gains = [...alternatives.map((alt) => alt.elevationGainMeters)].sort((a, b) => a - b);
  const medianGain = gains[Math.floor(gains.length / 2)] ?? 0;

  const score = (alt: RouteAlternative) => {
    const distancePenalty = Math.abs(alt.distanceMeters - target);
    const elevation = alt.elevationGainMeters;
    if (preference === "min") {
      return distancePenalty * 2 + elevation;
    }
    if (preference === "max") {
      return distancePenalty * 2 - elevation;
    }
    const elevPenalty = Math.abs(elevation - medianGain);
    return distancePenalty + elevPenalty;
  };

  const sorted = [...alternatives];
  sorted.sort((a, b) => score(a) - score(b));
  if (preference === "max") {
    return sorted.reverse();
  }
  return sorted;
}

interface DetourOptions {
  routing: RoutingProvider;
  baseline: RoutingProviderRoute;
  target: number;
  tolerance: number;
}

async function buildDetourCandidates(options: DetourOptions): Promise<RouteCandidate[]> {
  const { baseline, routing, target, tolerance } = options;
  const baseCoords = baseline.coordinates;
  const baseLength = baseline.distanceMeters;
  const delta = target - baseLength;
  const anchors = sampleAnchors(baseCoords, 3);
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const results: RouteCandidate[] = [];

  for (const anchor of anchors) {
    const { prefix, suffix } = splitBaseline(baseCoords, anchor);
    for (const bearing of bearings) {
      const candidate = await searchForDetour({
        routing,
        prefix,
        suffix,
        anchor,
        bearing,
        target,
        tolerance,
        baseLength,
        delta,
      });
      if (candidate) {
        results.push({ route: candidate, kind: "detour", label: `loop-${bearing}` });
      }
    }
  }
  return results;
}

function sampleAnchors(path: { lat: number; lng: number }[], count: number) {
  const total = computePathLength(path);
  const spacing = total / (count + 1);
  const anchors: { lat: number; lng: number }[] = [];
  if (path.length <= 2) {
    if (path[1]) anchors.push(path[1]);
    return anchors;
  }
  const cumulative = cumulativeDistances(path);
  for (let i = 1; i <= count; i += 1) {
    const target = spacing * i;
    anchors.push(interpolatePoint(path, cumulative, target));
  }
  return anchors;
}

function splitBaseline(
  baseCoords: { lat: number; lng: number }[],
  anchor: { lat: number; lng: number },
) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  baseCoords.forEach((coord, index) => {
    const d = haversineDistance(coord, anchor);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearestIndex = index;
    }
  });
  const prefix = baseCoords.slice(0, nearestIndex + 1);
  const suffix = baseCoords.slice(nearestIndex);
  return { prefix, suffix };
}

async function searchForDetour({
  routing,
  prefix,
  suffix,
  anchor,
  bearing,
  target,
  tolerance,
  baseLength,
  delta,
}: {
  routing: RoutingProvider;
  prefix: { lat: number; lng: number }[];
  suffix: { lat: number; lng: number }[];
  anchor: { lat: number; lng: number };
  bearing: number;
  target: number;
  tolerance: number;
  baseLength: number;
  delta: number;
}): Promise<RoutingProviderRoute | null> {
  let low = Math.max(50, delta / 4);
  let high = Math.max(delta * 2, 500);
  let best: { route: RoutingProviderRoute; diff: number } | null = null;

  for (let i = 0; i < 5; i += 1) {
    const radius = (low + high) / 2;
    const waypoint = destinationPoint(anchor, bearing, radius);
    const detourRoutes = await routing.getRouteBetween([anchor, waypoint, anchor]);
    if (!detourRoutes[0]) {
      break;
    }
    const detour = detourRoutes[0];
    const combinedCoords = combineRoute(prefix, detour.coordinates, suffix);
    const totalDistance = computePathLength(combinedCoords);
    const diff = totalDistance - target;
    if (!best || Math.abs(diff) < Math.abs(best.diff)) {
      best = {
        route: {
          polyline: encodeCombined(combinedCoords),
          coordinates: combinedCoords,
          distanceMeters: totalDistance,
          durationSeconds: (detour.durationSeconds ?? 0) + baseLength / 2.8,
          providerMeta: {
            detourBearing: bearing,
            detourRadius: radius,
          },
        },
        diff,
      };
    }
    if (Math.abs(diff) <= tolerance) {
      break;
    }
    if (diff < 0) {
      low = radius;
    } else {
      high = radius;
    }
  }
  return best?.route ?? null;
}

function combineRoute(
  prefix: { lat: number; lng: number }[],
  loop: { lat: number; lng: number }[],
  suffix: { lat: number; lng: number }[],
): { lat: number; lng: number }[] {
  const combined = [...prefix];
  if (loop.length > 2) {
    combined.push(...loop.slice(1, -1));
  }
  if (suffix.length > 0) {
    combined.push(...suffix.slice(1));
  }
  return combined;
}

function encodeCombined(coords: { lat: number; lng: number }[]): string {
  return polyline.encode(coords.map((c) => [c.lat, c.lng]));
}

export const __testables = {
  roundTripBinarySearch,
  sampleAnchors,
  splitBaseline,
  searchForDetour,
  combineRoute,
  buildRouteAnnotations,
};
