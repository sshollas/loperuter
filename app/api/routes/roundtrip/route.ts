import { NextResponse } from 'next/server';
import { planRoundTripRoute } from '@/lib/routing';
import type { RoundTripRequest } from '@/lib/routing/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoundTripRequest;
    if (!body) {
      return NextResponse.json({ error: 'Mangler request-body' }, { status: 400 });
    }
    const response = await planRoundTripRoute(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Roundtrip API-feil', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ukjent feil' },
      { status: 500 },
    );
  }
}
