import { describe, expect, it } from "vitest";
import { planPointToPoint, planRoundTrip, __testables } from "@/lib/routing";
import { MockRoutingProvider } from "@/lib/routing/providers/mock";
import type { ElevationService } from "@/lib/elevation";

const stubElevation: ElevationService = {
  async getProfile() {
    return [
      { d: 0, z: 0 },
      { d: 100, z: 0 },
    ];
  },
  getTotals() {
    return { gain: 0, loss: 0 };
  },
};

const stubGeocoder = {
  async geocode(input: string | { lat: number; lng: number }) {
    if (typeof input === "string") {
      if (input.includes("Karl")) {
        return { lat: 59.9139, lng: 10.7522, label: input };
      }
      return { lat: 59.9203, lng: 10.7589, label: input };
    }
    return { ...input, label: "direct" };
  },
};

describe("routing heuristics", () => {
  it("rundtur-binary search konvergerer", async () => {
    const routing = new MockRoutingProvider();
    const route = await __testables.roundTripBinarySearch({
      routing,
      start: { lat: 59.9139, lng: 10.7522 },
      bearing: 90,
      target: 10000,
      tolerance: 150,
    });
    expect(route).not.toBeNull();
    if (!route) return;
    expect(Math.abs(route.distanceMeters - 10000)).toBeLessThanOrEqual(1500);
  });

  it("genererer rundtur med minst to alternativer", async () => {
    const response = await planRoundTrip(
      {
        start: { lat: 59.9139, lng: 10.7522 },
        targetDistanceMeters: 10000,
        distanceToleranceMeters: 500,
      },
      { routing: new MockRoutingProvider(), geocoder: stubGeocoder, elevation: stubElevation },
    );
    expect(response.alternatives.length).toBeGreaterThanOrEqual(2);
    response.alternatives.forEach((alt) => {
      expect(Math.abs(alt.distanceMeters - 10000)).toBeLessThanOrEqual(2000);
    });
  });

  it("kan øke distansen på punkt-til-punkt", async () => {
    const response = await planPointToPoint(
      {
        startAddress: "Karl Johans gate 1, Oslo",
        endAddress: "Dronning Eufemias gate 16, Oslo",
        targetDistanceMeters: 12000,
        distanceToleranceMeters: 800,
      },
      { routing: new MockRoutingProvider(), geocoder: stubGeocoder, elevation: stubElevation },
    );
    const match = response.alternatives.find((alt) =>
      Math.abs(alt.distanceMeters - 12000) <= 1500,
    );
    expect(match).toBeDefined();
  });
});
