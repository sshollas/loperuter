import { config } from '@/lib/config';
import type { Geocoder, GeocoderResult, LatLng } from '@/lib/routing/types';

const cache = new Map<string, GeocoderResult | null>();

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Geocoder request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

class NominatimGeocoder implements Geocoder {
  async geocode(address: string): Promise<GeocoderResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('q', address);
    const data = await fetchJson<any[]>(url.toString(), {
      headers: {
        'User-Agent': 'loperuter/0.1 (demo@example.com)',
      },
    });
    const first = data[0];
    if (!first) return null;
    return {
      point: { lat: Number(first.lat), lng: Number(first.lon) },
      label: first.display_name,
      raw: first,
    };
  }
}

class OrsGeocoder implements Geocoder {
  async geocode(address: string): Promise<GeocoderResult | null> {
    if (!config.orsGeocoderApiKey) {
      throw new Error('ORS API key mangler for geokoding');
    }
    const response = await fetchJson<{ features: any[] }>('https://api.openrouteservice.org/geocode/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.orsGeocoderApiKey,
      },
      body: JSON.stringify({ text: address, size: 1 }),
    });
    const feature = response.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return {
      point: { lat, lng },
      label: feature.properties.label,
      raw: feature,
    };
  }
}

class MockGeocoder implements Geocoder {
  async geocode(address: string): Promise<GeocoderResult | null> {
    const hash = Array.from(address)
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = 59.91 + ((hash % 200) - 100) / 1000;
    const lng = 10.75 + ((hash % 300) - 150) / 1000;
    return {
      point: { lat, lng },
      label: `Mock(${address})`,
    };
  }
}

export function createGeocoder(): Geocoder {
  if (config.routingProvider === 'mock') {
    return new MockGeocoder();
  }
  if (config.geocoderProvider === 'ors') {
    return new OrsGeocoder();
  }
  return new NominatimGeocoder();
}

export async function resolveLocation(
  geocoder: Geocoder,
  value?: { lat?: number; lng?: number } | LatLng | null,
  address?: string,
): Promise<LatLng | null> {
  if (value && typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  if (!address) return null;
  const key = `addr:${address}`;
  if (cache.has(key)) {
    return cache.get(key)?.point ?? null;
  }
  const result = await geocoder.geocode(address);
  cache.set(key, result);
  return result?.point ?? null;
}
