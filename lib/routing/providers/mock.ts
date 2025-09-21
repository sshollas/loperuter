import { destinationPoint, encodePolyline } from "@/lib/geo/utils";
import { computePathLength } from "@/lib/geo/distance";
import type { LatLng } from "@/types/route";
import type { RoutingProvider, RoutingProviderRoute } from "../types";

function rotate(points: LatLng[], offset: number): LatLng[] {
  return points.map((_, index) => points[(index + offset) % points.length]);
}

export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock";

  readonly supportsRoundTrip = true;

  async getRouteBetween(coordinates: LatLng[]): Promise<RoutingProviderRoute[]> {
    if (coordinates.length < 2) {
      throw new Error("Minst to koordinater kreves for rute");
    }

    const path = buildInterpolatedPath(coordinates);
    const poly = encodePolyline(path);
    return [
      {
        polyline: poly,
        coordinates: path,
        distanceMeters: computePathLength(path),
        durationSeconds: computePathLength(path) / 2.8,
        providerMeta: { kind: "mock" },
      },
    ];
  }

  async getRoundTrip(
    start: LatLng,
    options: { length: number; seed?: number },
  ): Promise<RoutingProviderRoute[]> {
    const radius = options.length / (2 * Math.PI);
    const bearings = [0, 60, 120, 180, 240, 300];
    const points = bearings.map((bearing) =>
      destinationPoint(start, bearing + (options.seed ?? 0), radius),
    );
    const alternatives = [0, 1, 2].map((offset) => {
      const rotated = [start, ...rotate(points, offset), start];
      const full = buildInterpolatedPath(rotated);
      return {
        polyline: encodePolyline(full),
        coordinates: full,
        distanceMeters: computePathLength(full),
        durationSeconds: computePathLength(full) / 2.8,
        providerMeta: { seed: options.seed, offset },
      };
    });
    return alternatives;
  }
}

function buildInterpolatedPath(points: LatLng[]): LatLng[] {
  const path: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    path.push(from);
    const steps = 20;
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      path.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      });
    }
  }
  path.push(points[points.length - 1]);
  return path;
}
