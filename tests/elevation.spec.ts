import { mockElevationService } from '@/lib/elevation/mock';
import { encodePolyline } from '@/lib/geo/polyline';

describe('elevation service', () => {
  it('computes gain and loss from synthetic profile', async () => {
    const points = [
      { lat: 59.91, lng: 10.75 },
      { lat: 59.92, lng: 10.76 },
      { lat: 59.93, lng: 10.77 },
    ];
    const polyline = encodePolyline(points);
    const profile = await mockElevationService.getProfile(polyline);
    expect(profile.length).toBeGreaterThan(1);
    const totals = await mockElevationService.getTotals(polyline);
    expect(totals.gain).toBeGreaterThan(0);
    expect(totals.loss).toBeGreaterThan(0);
  });
});
