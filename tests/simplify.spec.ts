import { describe, expect, it } from "vitest";
import { douglasPeucker } from "@/lib/geo/simplify";
import type { LatLng } from "@/types/route";

describe("douglas peucker", () => {
  it("fjerner punkter innenfor toleranse", () => {
    const path: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0.0001, lng: 0.0001 },
      { lat: 0.0002, lng: 0.0002 },
      { lat: 0.001, lng: 0.001 },
    ];
    const simplified = douglasPeucker(path, 30);
    expect(simplified.length).toBeLessThan(path.length);
    expect(simplified[0]).toEqual(path[0]);
    expect(simplified[simplified.length - 1]).toEqual(path[path.length - 1]);
  });
});
