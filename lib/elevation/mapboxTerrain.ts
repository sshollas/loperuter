import axios from "axios";
import pLimit from "p-limit";
import { decodePolyline } from "@/lib/geo/utils";
import { haversineDistance, interpolateAlongPath } from "@/lib/geo/distance";
import type { ElevationProfilePoint, ElevationService, ElevationTotals } from "./index";
import { computeTotals } from "./index";

const limit = pLimit(4);

async function sampleElevation(
  token: string,
  lat: number,
  lng: number,
): Promise<number> {
  const url = new URL(
    `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json`,
  );
  url.searchParams.set("layers", "contour");
  url.searchParams.set("limit", "5");
  url.searchParams.set("access_token", token);

  const response = await axios.get(url.toString());
  const features = response.data?.features;
  if (!features || features.length === 0) {
    throw new Error("Ingen høydedata tilgjengelig");
  }
  const value = features[0]?.properties?.ele;
  if (typeof value !== "number") {
    throw new Error("Ugyldig høydedata");
  }
  return value;
}

export class MapboxTerrainElevationService implements ElevationService {
  constructor(private readonly token: string) {}

  async getProfile(polyline: string): Promise<ElevationProfilePoint[]> {
    const coords = decodePolyline(polyline);
    const samples = interpolateAlongPath(coords, 100);
    const promises = samples.map((point) =>
      limit(() => sampleElevation(this.token, point.lat, point.lng).catch(() => 0)),
    );
    const elevations = await Promise.all(promises);

    let distance = 0;
    return samples.map((point, index) => {
      if (index > 0) {
        const prev = samples[index - 1];
        distance += haversineDistance(prev, point);
      }
      return { d: distance, z: elevations[index] };
    });
  }

  getTotals(profile: ElevationProfilePoint[]): ElevationTotals {
    return computeTotals(profile);
  }
}
