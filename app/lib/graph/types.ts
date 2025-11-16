export type LatLng = { lat: number; lon: number };

export type ElevPref = 'min' | 'balanced' | 'max';

export interface RouteRequestBase {
  targetDistanceMeters: number;
  distanceToleranceMeters?: number;
  preferElevation?: ElevPref;
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
  overlapRatio?: number;
  estimatedTimeSeconds?: number;
}

export interface RouteResponse {
  alternatives: RouteAlternative[];
  center: LatLng;
  bounds: [[number, number], [number, number]];
  notes?: string[];
}

export interface GraphNode {
  id: number;
  lat: number;
  lon: number;
  elevation: number;
}

export interface GraphEdge {
  id: number;
  u: number;
  v: number;
  length: number;
  gain: number;
  loss: number;
}

export type AdjacentEdge = { to: number; length: number; edgeId: number };
