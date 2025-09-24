import { encodePolyline } from '@/lib/geo/polyline';
import { computeOverlapRatio } from '@/lib/geo/overlap';

describe('overlap computation', () => {
  const basePolyline = encodePolyline([
    { lat: 0, lng: 0 },
    { lat: 0, lng: 0.01 },
    { lat: 0.01, lng: 0.01 },
    { lat: 0.01, lng: 0 },
  ]);

  it('returns near zero overlap for orthogonal path', () => {
    const candidate = encodePolyline([
      { lat: 0, lng: 0 },
      { lat: -0.01, lng: 0 },
      { lat: -0.01, lng: 0.01 },
    ]);
    const overlap = computeOverlapRatio(basePolyline, candidate);
    expect(overlap).toBeLessThan(0.1);
  });

  it('detects partial overlap', () => {
    const candidate = encodePolyline([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      { lat: 0, lng: 0.02 },
    ]);
    const overlap = computeOverlapRatio(basePolyline, candidate);
    expect(overlap).toBeGreaterThan(0.2);
    expect(overlap).toBeLessThan(0.7);
  });

  it('detects high overlap', () => {
    const candidate = encodePolyline([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      { lat: 0.01, lng: 0.01 },
    ]);
    const overlap = computeOverlapRatio(basePolyline, candidate);
    expect(overlap).toBeGreaterThan(0.7);
  });
});
