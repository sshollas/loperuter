import { NextRequest, NextResponse } from 'next/server';

import { buildDetours } from '@/app/lib/graph/detour';
import { loadGraph } from '@/app/lib/graph/loader';
import { PointToPointRequest, RouteResponse } from '@/app/lib/graph/types';
import { resolveLocation } from '@/app/lib/geo/geocode';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PointToPointRequest;
    const start = await resolveLocation(body.startAddress, body.start);
    const end = await resolveLocation(body.endAddress, body.end);
    const alternatives = buildDetours({ ...body, start: start.point, end: end.point });
    const { bounds } = loadGraph();
    const center = {
      lat: (bounds[0][0] + bounds[1][0]) / 2,
      lon: (bounds[0][1] + bounds[1][1]) / 2,
    };
    const response: RouteResponse = {
      alternatives,
      center,
      bounds,
      notes: ['Detour loop search uses deterministic DFS with overlap penalties.'],
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
