import type { LatLng } from '@/lib/routing/types';

const EARTH_RADIUS = 6371_000;

const toRad = (value: number) => (value * Math.PI) / 180;
const toDeg = (value: number) => (value * 180) / Math.PI;

export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pathLength(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

export function computeBounds(points: LatLng[]): [[number, number], [number, number]] {
  if (points.length === 0) {
    return [[0, 0], [0, 0]];
  }
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  points.forEach((p) => {
    minLat = Math.min(minLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLat = Math.max(maxLat, p.lat);
    maxLng = Math.max(maxLng, p.lng);
  });
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function computeCenter(points: LatLng[]): LatLng {
  if (!points.length) {
    return { lat: 0, lng: 0 };
  }
  const bounds = computeBounds(points);
  return {
    lat: (bounds[0][1] + bounds[1][1]) / 2,
    lng: (bounds[0][0] + bounds[1][0]) / 2,
  };
}

export function interpolatePoint(a: LatLng, b: LatLng, fraction: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * fraction,
    lng: a.lng + (b.lng - a.lng) * fraction,
  };
}

export function bearingBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lng - a.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

export function destinationPoint(origin: LatLng, bearing: number, distance: number): LatLng {
  const angDist = distance / EARTH_RADIUS;
  const brng = toRad(bearing);
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
      Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDeg(lat2),
    lng: ((toDeg(lon2) + 540) % 360) - 180,
  };
}

export function resampleLine(points: LatLng[], stepMeters: number): LatLng[] {
  if (points.length < 2) return points;
  const result: LatLng[] = [points[0]];
  let accumulated = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    let segmentLength = haversineDistance(prev, current);
    if (segmentLength === 0) continue;
    while (accumulated + segmentLength >= stepMeters) {
      const remaining = stepMeters - accumulated;
      const fraction = remaining / segmentLength;
      const nextPoint = interpolatePoint(prev, current, fraction);
      result.push(nextPoint);
      segmentLength -= remaining;
      accumulated = 0;
    }
    accumulated += segmentLength;
  }
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  return result;
}

export function cumulativeDistances(points: LatLng[]): number[] {
  const distances: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    distances[i] = distances[i - 1] + haversineDistance(points[i - 1], points[i]);
  }
  return distances;
}

export function sampleAlong(points: LatLng[], distanceMeters: number): LatLng {
  const distances = cumulativeDistances(points);
  const total = distances[distances.length - 1] ?? 0;
  if (total === 0) return points[0];
  const target = Math.min(distanceMeters, total);
  for (let i = 1; i < points.length; i += 1) {
    if (distances[i] >= target) {
      const overshoot = distances[i] - target;
      const segment = haversineDistance(points[i - 1], points[i]);
      const frac = segment === 0 ? 0 : 1 - overshoot / segment;
      return interpolatePoint(points[i - 1], points[i], frac);
    }
  }
  return points[points.length - 1];
}
