import { LatLng } from '../graph/types';

export interface GeocodeResult {
  point: LatLng;
  source: 'direct' | 'mock' | 'nominatim' | 'manual';
}

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT =
  process.env.GEOCODER_USER_AGENT ?? 'loperuter-mvp/1.0 (https://github.com/openai)';

function parseLatLon(candidate: string): LatLng | null {
  const match = candidate
    .trim()
    .replace(/\s+/g, '')
    .match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { lat: Number(match[1]), lon: Number(match[2]) };
}

async function geocodeAddress(address: string): Promise<LatLng> {
  const query = new URLSearchParams({
    q: address.includes('Oslo') ? address : `${address}, Oslo, Norway`,
    format: 'jsonv2',
    addressdetails: '0',
    limit: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE_URL}?${query.toString()}`, {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Geocoding failed. Please try another address.');
  }
  const candidates = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!candidates.length) {
    throw new Error('Fant ikke en posisjon for adressen. Juster søket og prøv igjen.');
  }
  const { lat, lon } = candidates[0];
  return { lat: Number(lat), lon: Number(lon) };
}

export async function resolveLocation(address?: string, fallback?: LatLng): Promise<GeocodeResult> {
  if (fallback) {
    return { point: fallback, source: 'direct' };
  }
  if (!address) {
    throw new Error('Oppgi en adresse eller koordinater.');
  }
  const parsed = parseLatLon(address);
  if (parsed) {
    return { point: parsed, source: 'manual' };
  }
  const point = await geocodeAddress(address);
  return { point, source: 'nominatim' };
}
