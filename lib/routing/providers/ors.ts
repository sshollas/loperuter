import axios from "axios";
import { decodePolyline } from "@/lib/geo/utils";
import type { LatLng } from "@/types/route";
import type {
  RoutingProvider,
  RoutingProviderRoute,
  RoutingProviderStep,
} from "../types";

interface OrsRouteSummary {
  distance: number;
  duration: number;
}

interface OrsRoute {
  geometry: string;
  summary: OrsRouteSummary;
  segments?: OrsSegment[];
  [key: string]: unknown;
}

interface OrsSegment {
  steps?: OrsStep[];
}

interface OrsStep {
  distance: number;
  duration: number;
  instruction?: string;
  name?: string;
  [key: string]: unknown;
}

export class OrsRoutingProvider implements RoutingProvider {
  readonly name = "openrouteservice";

  readonly supportsRoundTrip = true;

  constructor(private readonly apiKey: string) {}

  async getRouteBetween(
    coordinates: LatLng[],
    options?: { alternatives?: number },
  ): Promise<RoutingProviderRoute[]> {
    const body: {
      coordinates: [number, number][];
      options?: {
        alternative_routes: {
          target_count: number;
          share_factor: number;
          weight_factor: number;
        };
      };
    } = {
      coordinates: coordinates.map((c) => [c.lng, c.lat]),
    };
    if (options?.alternatives) {
      body.options = {
        alternative_routes: {
          target_count: options.alternatives,
          share_factor: 0.6,
          weight_factor: 3,
        },
      };
    }

    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      body,
      {
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    const routes = (response.data?.routes ?? []) as OrsRoute[];
    return routes.map((route) => this.toRoute(route));
  }

  async getRoundTrip(
    start: LatLng,
    options: { length: number; seed?: number },
  ): Promise<RoutingProviderRoute[]> {
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      {
        coordinates: [[start.lng, start.lat]],
        round_trip: {
          length: options.length,
          points: 3,
          seed: options.seed ?? Math.floor(Math.random() * 10000),
        },
      },
      {
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    const routes = (response.data?.routes ?? []) as OrsRoute[];
    return routes.map((route) => this.toRoute(route));
  }

  private toRoute(route: OrsRoute): RoutingProviderRoute {
    const { summary, geometry } = route;
    const steps = (route.segments ?? [])
      .flatMap((segment) => segment.steps ?? [])
      .map((step) => this.toStep(step));
    const coordinates = decodePolyline(geometry);
    return {
      polyline: geometry,
      coordinates,
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
      providerMeta: route,
      steps,
    };
  }

  private toStep(step: OrsStep): RoutingProviderStep {
    return {
      distanceMeters: step.distance,
      durationSeconds: step.duration,
      instruction: step.instruction?.trim() || undefined,
      name: step.name?.trim() || undefined,
    };
  }
}
