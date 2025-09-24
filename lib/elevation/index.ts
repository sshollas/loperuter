import { config, isMockElevation } from '@/lib/config';
import type { ElevationService } from '@/lib/routing/types';
import { mapboxTerrainService } from '@/lib/elevation/mapboxTerrain';
import { mockElevationService } from '@/lib/elevation/mock';

let cachedService: ElevationService | null = null;

export function getElevationService(): ElevationService {
  if (cachedService) return cachedService;
  if (isMockElevation || !config.mapboxToken) {
    cachedService = mockElevationService;
  } else {
    cachedService = mapboxTerrainService;
  }
  return cachedService;
}
