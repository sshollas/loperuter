import type { GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';

export type LatLng = { lat: number; lng: number };

export type ElevPref = 'min' | 'balanced' | 'max';

export interface RouteRequestBase {
  targetDistanceMeters: number;
  distanceToleranceMeters?: number;
  preferElevation?: ElevPref;
  avoidPolygonsGeoJSON?: Polygon | MultiPolygon;
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

export interface ElevationProfilePoint {
  distanceMeters: number;
  elevationMeters: number;
}

export interface RouteAlternative {
  polyline: string;
  distanceMeters: number;
  durationSeconds?: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  overlapRatio?: number;
  providerMeta?: any;
  elevationProfile?: ElevationProfilePoint[];
  tags?: string[];
}

export interface RouteResponse {
  alternatives: RouteAlternative[];
  center: LatLng;
  bounds: [[number, number], [number, number]];
  notes?: string[];
}

export interface ProviderPointToPointParams {
  start: LatLng;
  end: LatLng;
  alternatives: number;
  via?: LatLng[];
  avoidPolygonsGeoJSON?: Polygon | MultiPolygon;
}

export interface ProviderRoundTripParams {
  start: LatLng;
  targetDistanceMeters: number;
  alternatives: number;
  avoidPolygonsGeoJSON?: Polygon | MultiPolygon;
}

export interface RoutingProvider {
  id: string;
  supportsRoundTrip: boolean;
  getPointToPointRoutes(params: ProviderPointToPointParams): Promise<RouteAlternative[]>;
  getRoundTripRoutes(params: ProviderRoundTripParams): Promise<RouteAlternative[]>;
}

export type ProviderFactory = () => RoutingProvider;

export interface GeocoderResult {
  point: LatLng;
  label: string;
  raw?: GeoJsonProperties;
}

export interface Geocoder {
  geocode(address: string): Promise<GeocoderResult | null>;
}

export interface ElevationTotals {
  gain: number;
  loss: number;
}

export interface ElevationService {
  id: string;
  getProfile(polyline: string): Promise<ElevationProfilePoint[]>;
  getTotals(polyline: string): Promise<ElevationTotals>;
}

export interface OverlapComputationResult {
  overlapRatio: number;
}

export interface DetourCandidate {
  anchor: LatLng;
  radiusMeters: number;
  bearing: number;
  anchorIndex: number;
  initialVia?: LatLng;
}

export interface DetourBuildResult {
  route: RouteAlternative | null;
  candidate: DetourCandidate;
}
