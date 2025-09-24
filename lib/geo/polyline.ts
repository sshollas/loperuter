import { decode, encode } from '@googlemaps/polyline-codec';
import type { LatLng } from '@/lib/routing/types';

const PRECISION = 6;

export function decodePolyline(polyline: string): LatLng[] {
  return decode(polyline, PRECISION).map(([lat, lng]) => ({ lat, lng }));
}

export function encodePolyline(points: LatLng[]): string {
  return encode(points.map((p) => [p.lat, p.lng]), PRECISION);
}

export function reversePolyline(polyline: string): string {
  return encodePolyline(decodePolyline(polyline).reverse());
}
