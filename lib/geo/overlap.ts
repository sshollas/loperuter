import type { RouteAlternative } from '@/lib/routing/types';
import { decodePolyline } from '@/lib/geo/polyline';
import { haversineDistance, resampleLine } from '@/lib/geo/distance';

const STEP_METERS = 25;
const PRECISION = 1e3; // ~100m grid resolution for hashing segments

function quantize(value: number): number {
  return Math.round(value * PRECISION);
}

function buildSegmentHashes(points: ReturnType<typeof decodePolyline>): Map<string, number> {
  const resampled = resampleLine(points, STEP_METERS);
  const map = new Map<string, number>();
  for (let i = 1; i < resampled.length; i += 1) {
    const a = resampled[i - 1];
    const b = resampled[i];
    const hash = `${quantize(a.lat)}:${quantize(a.lng)}-${quantize(b.lat)}:${quantize(b.lng)}`;
    const distance = haversineDistance(a, b);
    map.set(hash, (map.get(hash) ?? 0) + distance);
  }
  return map;
}

export function computeOverlapRatio(baselinePolyline: string, candidatePolyline: string): number {
  const baselinePoints = decodePolyline(baselinePolyline);
  const candidatePoints = decodePolyline(candidatePolyline);
  if (baselinePoints.length < 2 || candidatePoints.length < 2) return 0;
  const baselineSegments = buildSegmentHashes(baselinePoints);
  const candidateSegments = buildSegmentHashes(candidatePoints);
  let shared = 0;
  let candidateTotal = 0;
  candidateSegments.forEach((value, hash) => {
    candidateTotal += value;
    if (baselineSegments.has(hash)) {
      shared += Math.min(value, baselineSegments.get(hash) ?? 0);
    }
  });
  if (candidateTotal === 0) return 0;
  return Math.min(1, shared / candidateTotal);
}

export function annotateOverlap(baseline: RouteAlternative, alternatives: RouteAlternative[]): RouteAlternative[] {
  return alternatives.map((alt) => ({
    ...alt,
    overlapRatio:
      alt.overlapRatio ?? (baseline ? computeOverlapRatio(baseline.polyline, alt.polyline) : undefined),
  }));
}

export function filterByOverlap(
  baseline: RouteAlternative,
  alternatives: RouteAlternative[],
  threshold = 0.6,
): RouteAlternative[] {
  const annotated = annotateOverlap(baseline, alternatives);
  return annotated.filter((alt, index) => {
    if (index === 0) return true;
    return (alt.overlapRatio ?? 0) <= threshold;
  });
}
