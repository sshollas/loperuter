import axios from "axios";
import { decodePolyline } from "@/lib/geo/utils";
import type { LatLng } from "@/types/route";
import type {
  RoutingProvider,
  RoutingProviderRoute,
  RoutingProviderStep,
} from "../types";

type OsrmProfile = "foot" | "cycling" | "driving";

const DEFAULT_BASE_URL = "https://router.project-osrm.org";
const DEFAULT_PROFILE: OsrmProfile = "foot";

const PROFILE_ALIASES: Record<string, OsrmProfile> = {
  foot: "foot",
  walking: "foot",
  running: "foot",
  pedestrian: "foot",
  cycling: "cycling",
  bicycle: "cycling",
  bike: "cycling",
  driving: "driving",
  car: "driving",
};

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs?: OsrmLeg[];
  [key: string]: unknown;
}

interface OsrmLeg {
  steps?: OsrmStep[];
}

interface OsrmStep {
  distance: number;
  duration: number;
  geometry: string;
  name: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
  };
}

export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = "osrm";

  readonly supportsRoundTrip = false;

  private readonly baseUrl: string;

  private readonly profile: OsrmProfile;

  constructor(options?: { baseUrl?: string; profile?: string }) {
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.profile = normalizeProfile(options?.profile);
  }

  async getRouteBetween(
    coordinates: LatLng[],
    options?: { alternatives?: number },
  ): Promise<RoutingProviderRoute[]> {
    if (coordinates.length < 2) {
      throw new Error("Minst to koordinater kreves for OSRM-ruting");
    }

    const coordinatePath = coordinates
      .map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`)
      .join(";");
    const url = new URL(`${this.baseUrl}/route/v1/${this.profile}/${coordinatePath}`);
    const alternativeCount = options?.alternatives ?? 1;
    if (alternativeCount > 1) {
      url.searchParams.set("alternatives", `${Math.min(alternativeCount, 3)}`);
    } else {
      url.searchParams.set("alternatives", "false");
    }
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "polyline");
    url.searchParams.set("steps", "true");
    url.searchParams.set("annotations", "distance,duration");

    const response = await axios.get(url.toString(), {
      headers: {
        "User-Agent": "loperuter-mvp/1.0 (contact: ops@example.com)",
      },
    });

    if (response.data?.code !== "Ok") {
      throw new Error(
        `OSRM svarte med kode ${response.data?.code ?? "ukjent"}`,
      );
    }

    const routes = (response.data?.routes ?? []) as OsrmRoute[];
    return routes.map((route) => this.toRoute(route));
  }

  private toRoute(route: OsrmRoute): RoutingProviderRoute {
    const coordinates = decodePolyline(route.geometry);
    const steps = (route.legs ?? [])
      .flatMap((leg) => leg.steps ?? [])
      .map((step) => this.toStep(step));
    return {
      polyline: route.geometry,
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      providerMeta: route,
      steps,
    };
  }

  private toStep(step: OsrmStep): RoutingProviderStep {
    return {
      distanceMeters: step.distance,
      durationSeconds: step.duration,
      name: step.name?.trim() || undefined,
      geometry: step.geometry ? decodePolyline(step.geometry) : undefined,
      maneuver: {
        type: step.maneuver?.type,
        modifier: step.maneuver?.modifier,
        bearingAfter: step.maneuver?.bearing_after,
        bearingBefore: step.maneuver?.bearing_before,
      },
    };
  }
}

function normalizeProfile(input?: string): OsrmProfile {
  if (!input) {
    return DEFAULT_PROFILE;
  }
  const normalized = input.toLowerCase();
  const mapped = PROFILE_ALIASES[normalized];
  if (mapped) {
    return mapped;
  }
  console.warn(
    `Ukjent OSRM profil '${input}', faller tilbake til '${DEFAULT_PROFILE}'.`,
  );
  return DEFAULT_PROFILE;
}
