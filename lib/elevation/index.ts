import { decodePolyline } from "@/lib/geo/utils";
import { interpolateAlongPath } from "@/lib/geo/distance";
import { MapboxTerrainElevationService } from "./mapboxTerrain";

export interface ElevationProfilePoint {
  d: number;
  z: number;
}

export interface ElevationTotals {
  gain: number;
  loss: number;
}

export interface ElevationService {
  getProfile(polyline: string): Promise<ElevationProfilePoint[]>;
  getTotals(profile: ElevationProfilePoint[]): ElevationTotals;
}

class MockElevationService implements ElevationService {
  async getProfile(polyline: string): Promise<ElevationProfilePoint[]> {
    const coords = decodePolyline(polyline);
    const samples = interpolateAlongPath(coords, Math.max(50, coords.length * 5));
    return samples.map((point, index) => ({
      d: index === 0 ? 0 : index * 50,
      z: 50 * Math.sin(point.lat * 10) + 20 * Math.cos(point.lng * 7),
    }));
  }

  getTotals(profile: ElevationProfilePoint[]): ElevationTotals {
    return computeTotals(profile);
  }
}

export function computeTotals(profile: ElevationProfilePoint[]): ElevationTotals {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < profile.length; i += 1) {
    const delta = profile[i].z - profile[i - 1].z;
    if (delta > 0) gain += delta;
    if (delta < 0) loss += Math.abs(delta);
  }
  return { gain, loss };
}

export function createElevationService(): ElevationService {
  const provider = process.env.ELEVATION_PROVIDER?.toLowerCase();
  if (provider === "mock") {
    return new MockElevationService();
  }
  const token = process.env.MAPBOX_TOKEN;
  if (provider === "mapbox" || token) {
    if (!token) {
      throw new Error("MAPBOX_TOKEN mangler for Mapbox-basert høydedata");
    }
    return new MapboxTerrainElevationService(token);
  }
  return new MockElevationService();
}
