import type { ElevationProfilePoint, ElevationService, ElevationTotals } from '@/lib/routing/types';
import { decodePolyline } from '@/lib/geo/polyline';
import { cumulativeDistances, resampleLine } from '@/lib/geo/distance';

export class MockElevationService implements ElevationService {
  id = 'mock';

  async getProfile(polyline: string): Promise<ElevationProfilePoint[]> {
    const basePoints = decodePolyline(polyline);
    if (basePoints.length < 2) return [];
    const sampled = resampleLine(basePoints, 100);
    const distances = cumulativeDistances(sampled);
    return sampled.map((point, index) => {
      const distance = distances[index];
      const elevation = 40 + 20 * Math.sin((distance / 500) + point.lat) + 15 * Math.cos(point.lng * 3);
      return {
        distanceMeters: distance,
        elevationMeters: elevation,
      };
    });
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

export const mockElevationService = new MockElevationService();
