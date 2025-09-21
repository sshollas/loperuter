import { LatLng } from "@/types/route";

export interface RoutingProviderRoute {
  polyline: string;
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds?: number;
  providerMeta?: unknown;
}

export interface RoutePlanningContext {
  targetDistance: number;
  tolerance: number;
  preferElevation: "min" | "max" | "balanced";
}

export interface RoutingProvider {
  readonly name: string;
  supportsRoundTrip: boolean;
  getRouteBetween(
    coordinates: LatLng[],
    options?: { alternatives?: number },
  ): Promise<RoutingProviderRoute[]>;
  getRoundTrip?(
    start: LatLng,
    options: { length: number; seed?: number },
  ): Promise<RoutingProviderRoute[]>;
}
