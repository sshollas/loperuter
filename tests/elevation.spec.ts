import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/elevation";
import type { ElevationProfilePoint } from "@/lib/elevation";

describe("elevation totals", () => {
  it("oppsummerer gevinst og tap", () => {
    const profile: ElevationProfilePoint[] = [
      { d: 0, z: 100 },
      { d: 50, z: 120 },
      { d: 100, z: 110 },
      { d: 150, z: 140 },
      { d: 200, z: 130 },
    ];
    const totals = computeTotals(profile);
    expect(totals.gain).toBeCloseTo(50);
    expect(totals.loss).toBeCloseTo(20);
  });
});
