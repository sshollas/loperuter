import { LatLng } from '../graph/types';

export interface GeocodeResult {
  point: LatLng;
  source: 'direct' | 'mock';
}

export async function resolveLocation(address?: string, fallback?: LatLng): Promise<GeocodeResult> {
  if (fallback) {
    return { point: fallback, source: 'direct' };
  }
  if (!address) {
    throw new Error('Either address or coordinates must be supplied.');
  }
  // TODO: Integrate with external geocoder like Kartverket or Mapbox.
  // For now we throw a clear error to avoid silently guessing locations.
  throw new Error('Geocoding by address is not implemented. Provide coordinates instead.');
}
