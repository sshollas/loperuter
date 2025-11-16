import { NextRequest, NextResponse } from 'next/server';

import { buildRoundTrip } from '@/app/lib/graph/roundtrip';
import { loadGraph } from '@/app/lib/graph/loader';
import { RoundTripRequest, RouteResponse } from '@/app/lib/graph/types';
import { resolveLocation } from '@/app/lib/geo/geocode';
import { pathToCoordinates } from '@/app/lib/graph/path';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RoundTripRequest;
    const start = await resolveLocation(body.startAddress, body.start);
    const alternatives = buildRoundTrip({ ...body, start: start.point });
    const { bounds } = loadGraph();
    const center = {
      lat: (bounds[0][0] + bounds[1][0]) / 2,
      lon: (bounds[0][1] + bounds[1][1]) / 2,
    };
    const response: RouteResponse = {
      alternatives,
      center,
      bounds,
      notes: ['Elevation gain/loss is currently mocked (0 m).'],
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
