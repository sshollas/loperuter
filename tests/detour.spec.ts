import { createMockProvider } from '@/lib/routing/providers/mock';
import { generateDetourAlternatives } from '@/lib/geo/detour';
import { destinationPoint } from '@/lib/geo/distance';
import { computeOverlapRatio } from '@/lib/geo/overlap';

describe('detour generator', () => {
  it('produces a longer candidate with limited overlap', async () => {
    const provider = createMockProvider();
    const start = { lat: 59.91, lng: 10.75 };
    const end = destinationPoint(start, 45, 3000);
    const baseline = (await provider.getPointToPointRoutes({ start, end, alternatives: 0 }))[0];
    expect(baseline).toBeDefined();
    const targetDistance = 10_000;
    const tolerance = 150;

    const detours = await generateDetourAlternatives(
      provider,
      baseline!,
      { start, end, alternatives: 0 },
      targetDistance,
      tolerance,
      { maxCandidates: 6 },
    );
    const match = detours.find((route) => Math.abs(route.distanceMeters - targetDistance) <= tolerance);
    expect(match).toBeDefined();
    if (match) {
      const overlap = computeOverlapRatio(baseline!.polyline, match.polyline);
      expect(overlap).toBeLessThan(0.6);
    }
  });
});
