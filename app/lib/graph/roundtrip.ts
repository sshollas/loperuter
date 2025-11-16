import { encodePath } from './path';
import { overlapRatio } from './overlap';
import { distancesFrom } from './dijkstra';
import { nearestNodeId } from './spatial';
import { RoundTripRequest, RouteAlternative } from './types';
import { shortestPath } from './shortest';

export function buildRoundTrip(request: RoundTripRequest): RouteAlternative[] {
  if (!request.start) throw new Error('start coordinate is required');
  const startId = nearestNodeId(request.start);
  const tolerance = request.distanceToleranceMeters ?? 150;
  const { targetDistanceMeters } = request;
  const halfDistance = targetDistanceMeters / 2;
  const distMap = distancesFrom(startId);
  const candidates = Array.from(distMap.entries())
    .filter(([, d]) => Math.abs(d - halfDistance) <= tolerance)
    .sort((a, b) => Math.abs(a[1] - halfDistance) - Math.abs(b[1] - halfDistance))
    .slice(0, 20)
    .map(([id]) => id);

  const alternatives: RouteAlternative[] = [];
  for (const candidate of candidates) {
    const outward = shortestPath(startId, candidate);
    const inward = shortestPath(candidate, startId);
    if (!outward || !inward) continue;
    const combinedPath = outward.path.concat(inward.path.slice(1));
    const totalDistance = outward.distance + inward.distance;
    if (Math.abs(totalDistance - targetDistanceMeters) > tolerance) continue;
    const polyline = encodePath(combinedPath);
    const overlap = overlapRatio(outward.path, inward.path);
    alternatives.push({
      polyline,
      distanceMeters: totalDistance,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      overlapRatio: overlap,
      estimatedTimeSeconds: Math.round((totalDistance / 1000 / 10) * 3600),
    });
  }

  alternatives.sort((a, b) => {
    const distDiff = Math.abs(a.distanceMeters - targetDistanceMeters) - Math.abs(b.distanceMeters - targetDistanceMeters);
    if (distDiff !== 0) return distDiff;
    if ((a.overlapRatio ?? 0) !== (b.overlapRatio ?? 0)) {
      return (a.overlapRatio ?? 0) - (b.overlapRatio ?? 0);
    }
    return a.distanceMeters - b.distanceMeters;
  });

  return alternatives.slice(0, 5);
}
