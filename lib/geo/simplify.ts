import simplify from 'simplify-js';
import type { LatLng } from '@/lib/routing/types';

export function simplifyLine(points: LatLng[], tolerance = 0.0001): LatLng[] {
  if (points.length <= 2) return points;
  const converted = points.map((p) => ({ x: p.lng, y: p.lat }));
  const simplified = simplify(converted, tolerance, true);
  return simplified.map((p) => ({ lat: p.y, lng: p.x }));
}
