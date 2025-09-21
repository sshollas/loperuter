import polyline from "@mapbox/polyline";
import { LatLng } from "@/types/route";

const EARTH_RADIUS = 6371000; // meters

export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return EARTH_RADIUS * c;
}

export function computePolylineLength(encoded: string): number {
  const coordinates = polyline.decode(encoded).map(([lat, lng]) => ({
    lat,
    lng,
  }));
  return computePathLength(coordinates);
}

export function computePathLength(path: LatLng[]): number {
  if (path.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += haversineDistance(path[i - 1], path[i]);
  }
  return total;
}

export function cumulativeDistances(path: LatLng[]): number[] {
  const distances = [0];
  for (let i = 1; i < path.length; i += 1) {
    distances[i] = distances[i - 1] + haversineDistance(path[i - 1], path[i]);
  }
  return distances;
}

export function interpolateAlongPath(
  path: LatLng[],
  spacingMeters: number,
): LatLng[] {
  if (path.length === 0) {
    return [];
  }
  if (path.length === 1) {
    return [path[0]];
  }

  const samples: LatLng[] = [path[0]];
  const distances = cumulativeDistances(path);
  const total = distances[distances.length - 1];
  for (
    let d = spacingMeters;
    d < total;
    d += spacingMeters
  ) {
    samples.push(interpolatePoint(path, distances, d));
  }
  samples.push(path[path.length - 1]);
  return samples;
}

export function interpolatePoint(
  path: LatLng[],
  distances: number[],
  target: number,
): LatLng {
  if (target <= 0) return path[0];
  const total = distances[distances.length - 1];
  if (target >= total) return path[path.length - 1];

  let i = 1;
  while (i < distances.length && distances[i] < target) {
    i += 1;
  }
  const prev = distances[i - 1];
  const next = distances[i];
  const t = (target - prev) / (next - prev || 1);
  const a = path[i - 1];
  const b = path[i];
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}
