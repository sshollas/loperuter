import axios from "axios";
import { decodePolyline } from "@/lib/geo/utils";
import type { LatLng } from "@/types/route";
import type { RoutingProvider, RoutingProviderRoute } from "../types";

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  [key: string]: unknown;
}

export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = "osrm";

  readonly supportsRoundTrip = false;

  constructor(private readonly baseUrl = "https://router.project-osrm.org") {}

  async getRouteBetween(
    coordinates: LatLng[],
    options?: { alternatives?: number },
  ): Promise<RoutingProviderRoute[]> {
    if (coordinates.length < 2) {
      throw new Error("Minst to koordinater kreves for OSRM-ruting");
    }

    const trimmedBase = this.baseUrl.replace(/\/$/, "");
    const coordinatePath = coordinates
      .map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`)
      .join(";");
    const url = new URL(`${trimmedBase}/route/v1/foot/${coordinatePath}`);
    const alternativeCount = options?.alternatives ?? 1;
    if (alternativeCount > 1) {
      url.searchParams.set("alternatives", `${Math.min(alternativeCount, 3)}`);
    } else {
      url.searchParams.set("alternatives", "false");
    }
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "polyline");
    url.searchParams.set("steps", "false");

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
    return {
      polyline: route.geometry,
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      providerMeta: route,
    };
  }
}
