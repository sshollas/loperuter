export type LatLng = { lat: number; lng: number };

export interface RouteRequestBase {
  preferElevation?: "min" | "max" | "balanced";
  targetDistanceMeters: number;
  distanceToleranceMeters?: number;
}

export interface RoundTripRequest extends RouteRequestBase {
  startAddress?: string;
  start?: LatLng;
}

export interface PointToPointRequest extends RouteRequestBase {
  startAddress?: string;
  start?: LatLng;
  endAddress?: string;
  end?: LatLng;
}

export interface RouteAlternative {
  polyline: string;
  distanceMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  estimatedTimeSeconds?: number;
  elevationProfile?: { distance: number; elevation: number }[];
  providerMeta?: unknown;
}

export interface RouteResponse {
  alternatives: RouteAlternative[];
  center: LatLng;
  bounds: [[number, number], [number, number]];
  notes?: string[];
}
