import { describe, expect, it } from "vitest";
import polyline from "@mapbox/polyline";
import {
  computePathLength,
  computePolylineLength,
  cumulativeDistances,
  haversineDistance,
  interpolateAlongPath,
  interpolatePoint,
} from "@/lib/geo/distance";
import type { LatLng } from "@/types/route";

describe("distance utilities", () => {
  it("beregner korrekt haversine-distanset", () => {
    const oslo: LatLng = { lat: 59.9139, lng: 10.7522 };
    const bergen: LatLng = { lat: 60.39299, lng: 5.32415 };
    const distance = haversineDistance(oslo, bergen);
    expect(Math.round(distance / 1000)).toBe(305);
  });

  it("beregner polylinelengde", () => {
    const points: LatLng[] = [
      { lat: 59.91, lng: 10.75 },
      { lat: 59.92, lng: 10.76 },
      { lat: 59.93, lng: 10.77 },
    ];
    const encoded = polyline.encode(points.map((p) => [p.lat, p.lng]));
    const length = computePolylineLength(encoded);
    expect(length).toBeGreaterThan(2000);
  });

  it("interpolerer punkter langs ruten", () => {
    const path: LatLng[] = [
      { lat: 59.0, lng: 10.0 },
      { lat: 59.001, lng: 10.001 },
      { lat: 59.002, lng: 10.002 },
    ];
    const samples = interpolateAlongPath(path, 50);
    expect(samples.length).toBeGreaterThan(path.length);
    const distances = cumulativeDistances(path);
    const point = interpolatePoint(path, distances, distances[distances.length - 1] / 2);
    expect(point.lat).toBeGreaterThan(path[0].lat);
    expect(point.lat).toBeLessThan(path[path.length - 1].lat);
  });

  it("beregner path-lengde fra koordinater", () => {
    const path: LatLng[] = [
      { lat: 59.0, lng: 10.0 },
      { lat: 59.01, lng: 10.0 },
    ];
    expect(Math.round(computePathLength(path))).toBeGreaterThan(1100);
  });
});
