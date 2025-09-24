import { config } from '@/lib/config';
import type { ElevationProfilePoint, ElevationService, ElevationTotals } from '@/lib/routing/types';
import { decodePolyline } from '@/lib/geo/polyline';
import { cumulativeDistances, resampleLine } from '@/lib/geo/distance';

async function queryElevation(lat: number, lng: number): Promise<number> {
  if (!config.mapboxToken) {
    throw new Error('MAPBOX_TOKEN mangler for terreng-data');
  }
  const url = new URL(`https://api.mapbox.com/v4/mapbox.terrain-rgb/tilequery/${lng},${lat}.json`);
  url.searchParams.set('layers', 'contour');
  url.searchParams.set('limit', '5');
  url.searchParams.set('radius', '150');
  url.searchParams.set('access_token', config.mapboxToken);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox tilequery feilet med ${response.status}`);
  }
  const data = (await response.json()) as { features?: Array<{ properties: Record<string, any> }> };
  const feature = data.features?.[0];
  if (!feature) {
    return 0;
  }
  const ele = feature.properties.ele ?? feature.properties.contour ?? 0;
  return Number(ele);
}

export class MapboxTerrainService implements ElevationService {
  id = 'mapbox';

  async getProfile(polyline: string): Promise<ElevationProfilePoint[]> {
    const basePoints = decodePolyline(polyline);
    if (basePoints.length < 2) return [];
    const sampled = resampleLine(basePoints, 120).slice(0, 250);
    const distances = cumulativeDistances(sampled);
    const profile: ElevationProfilePoint[] = [];
    for (let i = 0; i < sampled.length; i += 1) {
      const point = sampled[i];
      const elevation = await queryElevation(point.lat, point.lng);
      profile.push({
        distanceMeters: distances[i],
        elevationMeters: elevation,
      });
    }
    return profile;
  }

  async getTotals(polyline: string): Promise<ElevationTotals> {
    const profile = await this.getProfile(polyline);
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < profile.length; i += 1) {
      const diff = profile[i].elevationMeters - profile[i - 1].elevationMeters;
      if (diff > 0) gain += diff;
      else loss -= diff;
    }
    return { gain, loss };
  }
}

export const mapboxTerrainService = new MapboxTerrainService();
