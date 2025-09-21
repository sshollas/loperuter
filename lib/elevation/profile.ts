import type { RouteAlternative } from "@/types/route";

export function elevationAtDistance(
  profile: RouteAlternative["elevationProfile"],
  distanceMeters: number,
): number | undefined {
  if (!profile || profile.length === 0) {
    return undefined;
  }

  const target = Math.max(0, distanceMeters);
  const last = profile[profile.length - 1];
  if (!last) {
    return undefined;
  }

  if (target <= profile[0].distance) {
    return profile[0].elevation;
  }
  if (target >= last.distance) {
    return last.elevation;
  }

  let index = 1;
  while (index < profile.length && profile[index].distance < target) {
    index += 1;
  }

  const next = profile[index];
  const prev = profile[index - 1];
  if (!prev || !next) {
    return last.elevation;
  }

  const span = next.distance - prev.distance;
  const ratio = span <= 0 ? 0 : (target - prev.distance) / span;
  return prev.elevation + (next.elevation - prev.elevation) * ratio;
}

export function clampDistance(
  profile: RouteAlternative["elevationProfile"],
  distanceMeters: number,
): number {
  if (!profile || profile.length === 0) {
    return Math.max(0, distanceMeters);
  }
  const last = profile[profile.length - 1];
  const max = last?.distance ?? 0;
  if (!Number.isFinite(max) || max <= 0) {
    return Math.max(0, distanceMeters);
  }
  return Math.min(Math.max(0, distanceMeters), max);
}
