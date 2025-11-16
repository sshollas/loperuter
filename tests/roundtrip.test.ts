import { describe, it, expect } from 'vitest';

import { buildRoundTrip } from '@/app/lib/graph/roundtrip';

const start = { lat: 59.91, lon: 10.75 };

describe('roundtrip heuristic', () => {
  it('returns alternatives within tolerance', () => {
    const routes = buildRoundTrip({ start, targetDistanceMeters: 1000, distanceToleranceMeters: 500 });
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(Math.abs(r.distanceMeters - 1000)).toBeLessThanOrEqual(500);
    }
  });
});
