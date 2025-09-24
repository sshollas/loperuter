import { rankAlternatives } from '@/lib/routing';
import type { RouteAlternative } from '@/lib/routing/types';

describe('routing ranking', () => {
  const baseAlternatives: RouteAlternative[] = [
    {
      polyline: 'mock1',
      distanceMeters: 10_000,
      durationSeconds: 3600,
      elevationGainMeters: 200,
      elevationLossMeters: 200,
      overlapRatio: 0.2,
    },
    {
      polyline: 'mock2',
      distanceMeters: 10_050,
      durationSeconds: 3620,
      elevationGainMeters: 100,
      elevationLossMeters: 100,
      overlapRatio: 0.1,
    },
    {
      polyline: 'mock3',
      distanceMeters: 9_950,
      durationSeconds: 3580,
      elevationGainMeters: 350,
      elevationLossMeters: 350,
      overlapRatio: 0.3,
    },
  ];

  it('prioritises lower elevation when preferElevation=min', () => {
    const ranked = rankAlternatives(baseAlternatives, 10_000, 'min');
    expect(ranked[0].polyline).toBe('mock2');
  });

  it('prioritises higher elevation when preferElevation=max', () => {
    const ranked = rankAlternatives(baseAlternatives, 10_000, 'max');
    expect(ranked[0].polyline).toBe('mock3');
  });

  it('prefers lower overlap when distance deviation is equal', () => {
    const alternatives: RouteAlternative[] = [
      { ...baseAlternatives[0], polyline: 'a', overlapRatio: 0.7, distanceMeters: 10_100 },
      { ...baseAlternatives[0], polyline: 'b', overlapRatio: 0.2, distanceMeters: 10_100 },
    ];
    const ranked = rankAlternatives(alternatives, 10_000, 'balanced');
    expect(ranked[0].polyline).toBe('b');
  });
});
