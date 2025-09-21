import polyline from "@mapbox/polyline";
import { LatLng } from "@/types/route";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS = 6371000;

export function destinationPoint(
  origin: LatLng,
  bearingDegrees: number,
  distanceMeters: number,
): LatLng {
  const bearing = bearingDegrees * DEG_TO_RAD;
  const lat1 = origin.lat * DEG_TO_RAD;
  const lng1 = origin.lng * DEG_TO_RAD;
  const angularDistance = distanceMeters / EARTH_RADIUS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: lat2 * RAD_TO_DEG, lng: ((lng2 * RAD_TO_DEG + 540) % 360) - 180 };
}

export function decodePolyline(encoded: string): LatLng[] {
  return polyline.decode(encoded).map(([lat, lng]) => ({ lat, lng }));
}

export function encodePolyline(coords: LatLng[]): string {
  return polyline.encode(coords.map((c) => [c.lat, c.lng]));
}

export function computeBounds(coords: LatLng[]): [[number, number], [number, number]] {
  if (coords.length === 0) {
    return [
      [0, 0],
      [0, 0],
    ];
  }
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;
  coords.forEach((c) => {
    minLat = Math.min(minLat, c.lat);
    maxLat = Math.max(maxLat, c.lat);
    minLng = Math.min(minLng, c.lng);
    maxLng = Math.max(maxLng, c.lng);
  });
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function centroid(coords: LatLng[]): LatLng {
  if (coords.length === 0) {
    return { lat: 0, lng: 0 };
  }
  const sum = coords.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

export function hashPath(coords: LatLng[]): string {
  return coords
    .filter((_, index) => index % Math.max(1, Math.floor(coords.length / 20)) === 0)
    .map((p) => `${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`)
    .join("|");
}
