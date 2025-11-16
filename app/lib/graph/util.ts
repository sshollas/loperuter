import { LatLng } from './types';

export function haversineMeters(a: LatLng, b: LatLng): number {
  const r = 6371000;
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const dphi = phi2 - phi1;
  const dlambda = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function encodeBounds(points: LatLng[]): [[number, number], [number, number]] {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
