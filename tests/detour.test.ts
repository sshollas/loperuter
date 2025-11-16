import { describe, it, expect } from 'vitest';

import { buildDetours } from '@/app/lib/graph/detour';

const start = { lat: 59.91, lon: 10.75 };
const end = { lat: 59.912, lon: 10.76 };

describe('detour heuristics', () => {
  it('returns at least one detour when target exceeds baseline', () => {
    const routes = buildDetours({ start, end, targetDistanceMeters: 2000, distanceToleranceMeters: 800 });
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(Math.abs(r.distanceMeters - 2000)).toBeLessThanOrEqual(800);
    }
  });
});
