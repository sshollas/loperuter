export interface AppConfig {
  routingProvider: string;
  osrmUrl?: string;
  orsApiKey?: string;
  valhallaUrl?: string;
  graphhopperUrl?: string;
  geocoderProvider: string;
  orsGeocoderApiKey?: string;
  elevationProvider: string;
  mapboxToken?: string;
}

export const config: AppConfig = {
  routingProvider: process.env.ROUTING_PROVIDER ?? 'mock',
  osrmUrl: process.env.OSRM_URL,
  orsApiKey: process.env.ORS_API_KEY,
  valhallaUrl: process.env.VALHALLA_URL,
  graphhopperUrl: process.env.GRAPHHOPPER_URL,
  geocoderProvider: process.env.GEOCODER_PROVIDER ?? 'nominatim',
  orsGeocoderApiKey: process.env.ORS_API_KEY,
  elevationProvider: process.env.ELEVATION_PROVIDER ?? 'mock',
  mapboxToken: process.env.MAPBOX_TOKEN,
};

export const isMockRouting = config.routingProvider === 'mock';
export const isMockElevation = config.elevationProvider === 'mock';
