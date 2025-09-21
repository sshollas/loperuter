import axios from "axios";
import { LatLng } from "@/types/route";

export interface GeocodingResult extends LatLng {
  label: string;
}

export interface GeocodingService {
  geocode(input: string | LatLng): Promise<GeocodingResult>;
}

type ProviderName = "ors" | "nominatim" | "mock";

function envProvider(): ProviderName {
  const value = process.env.GEOCODER_PROVIDER?.toLowerCase();
  if (value === "ors" || value === "nominatim" || value === "mock") {
    return value;
  }
  return process.env.ORS_API_KEY ? "ors" : "nominatim";
}

class OrsGeocoder implements GeocodingService {
  constructor(private readonly apiKey: string) {}

  async geocode(input: string | LatLng): Promise<GeocodingResult> {
    if (typeof input !== "string") {
      return { ...input, label: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}` };
    }
    const response = await axios.post(
      "https://api.openrouteservice.org/geocode/search",
      { text: input, boundary_type: "circle" },
      {
        headers: { Authorization: this.apiKey, "Content-Type": "application/json" },
      },
    );
    const feature = response.data?.features?.[0];
    if (!feature) {
      throw new Error(`Fant ingen treff for ${input}`);
    }
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng, label: feature.properties.label };
  }
}

class NominatimGeocoder implements GeocodingService {
  async geocode(input: string | LatLng): Promise<GeocodingResult> {
    if (typeof input !== "string") {
      return { ...input, label: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}` };
    }
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", input);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const response = await axios.get(url.toString(), {
      headers: {
        "User-Agent": "loperuter-mvp/1.0 (contact: ops@example.com)",
      },
    });
    const match = response.data?.[0];
    if (!match) {
      throw new Error(`Fant ingen treff for ${input}`);
    }
    return {
      lat: Number.parseFloat(match.lat),
      lng: Number.parseFloat(match.lon),
      label: match.display_name,
    };
  }
}

class MockGeocoder implements GeocodingService {
  private readonly anchor: LatLng = { lat: 59.9139, lng: 10.7522 };

  async geocode(input: string | LatLng): Promise<GeocodingResult> {
    if (typeof input !== "string") {
      return { ...input, label: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}` };
    }
    const hash = Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 2000) - 1000) / 10000;
    const lngOffset = (((hash / 2000) % 2000) - 1000) / 10000;
    return {
      lat: this.anchor.lat + latOffset,
      lng: this.anchor.lng + lngOffset,
      label: input,
    };
  }
}

export function createGeocodingService(): GeocodingService {
  const provider = envProvider();
  if (provider === "ors") {
    const key = process.env.ORS_API_KEY;
    if (!key) {
      throw new Error("ORS_API_KEY mangler for ORS geokoding");
    }
    return new OrsGeocoder(key);
  }
  if (provider === "mock") {
    return new MockGeocoder();
  }
  return new NominatimGeocoder();
}
