import { NextResponse } from 'next/server';

import { loadGraph } from '@/app/lib/graph/loader';

export async function GET() {
  const graph = loadGraph();
  return NextResponse.json({
    status: 'ok',
    nodes: graph.nodes.size,
    bounds: graph.bounds,
  });
}
