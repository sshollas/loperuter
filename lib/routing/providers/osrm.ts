import type { LatLng } from "@/types/route";
import type { RoutingProvider, RoutingProviderRoute } from "../types";

/**
 * Minimal plassholder for OSRM-integrasjon. Kan implementeres ved å
 * konsumere et OSRM-directions endepunkt som støtter `alternatives=3`.
 */
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = "osrm";

  readonly supportsRoundTrip = false;

  async getRouteBetween(_coordinates: LatLng[]): Promise<RoutingProviderRoute[]> {
    void _coordinates;
    throw new Error("OSRM-provider er ikke implementert i denne MVP-en");
  }
}
