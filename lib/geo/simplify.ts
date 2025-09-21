import { LatLng } from "@/types/route";
import { haversineDistance } from "./distance";

function perpendicularDistance(point: LatLng, start: LatLng, end: LatLng): number {
  const length = haversineDistance(start, end);
  if (length === 0) {
    return haversineDistance(point, start);
  }

  const t =
    ((point.lng - start.lng) * (end.lng - start.lng) +
      (point.lat - start.lat) * (end.lat - start.lat)) /
    ((end.lng - start.lng) * (end.lng - start.lng) +
      (end.lat - start.lat) * (end.lat - start.lat));

  if (t < 0) return haversineDistance(point, start);
  if (t > 1) return haversineDistance(point, end);

  const projection: LatLng = {
    lng: start.lng + t * (end.lng - start.lng),
    lat: start.lat + t * (end.lat - start.lat),
  };
  return haversineDistance(point, projection);
}

export function douglasPeucker(path: LatLng[], toleranceMeters: number): LatLng[] {
  if (path.length <= 2) {
    return [...path];
  }

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < path.length - 1; i += 1) {
    const distance = perpendicularDistance(path[i], path[0], path[path.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > toleranceMeters) {
    const left = douglasPeucker(path.slice(0, index + 1), toleranceMeters);
    const right = douglasPeucker(path.slice(index), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }

  return [path[0], path[path.length - 1]];
}
