import { NextResponse } from 'next/server';
import { planPointToPointRoute } from '@/lib/routing';
import type { PointToPointRequest } from '@/lib/routing/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PointToPointRequest;
    if (!body) {
      return NextResponse.json({ error: 'Mangler request-body' }, { status: 400 });
    }
    const response = await planPointToPointRoute(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Point2point API-feil', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ukjent feil' },
      { status: 500 },
    );
  }
}
