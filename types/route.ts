export type LatLng = { lat: number; lng: number };

export interface RouteRequestBase {
  preferElevation?: "min" | "max" | "balanced";
  targetDistanceMeters: number;
  distanceToleranceMeters?: number;
  avoidRevisiting?: boolean;
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
  kilometerMarkers?: RouteKilometerMarker[];
  segments?: RouteSegment[];
  providerMeta?: unknown;
  revisitFraction?: number;
}

export interface RouteResponse {
  alternatives: RouteAlternative[];
  center: LatLng;
  bounds: [[number, number], [number, number]];
  notes?: string[];
}

export interface RouteKilometerMarker {
  distanceMeters: number;
  coordinate: LatLng;
  label: string;
}

export interface RouteSegment {
  startDistanceMeters: number;
  endDistanceMeters: number;
  lengthMeters: number;
  headingDegrees: number;
  streetName?: string;
  instruction?: string;
  maneuverType?: string;
  turnModifier?: string;
}
