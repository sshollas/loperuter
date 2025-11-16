import { describe, it, expect } from 'vitest';

import { shortestPath } from '@/app/lib/graph/shortest';
import { loadGraph } from '@/app/lib/graph/loader';

describe('shortestPath', () => {
  it('finds a path between sample nodes', () => {
    const graph = loadGraph();
    const ids = Array.from(graph.nodes.keys());
    const start = ids[0];
    const end = ids[ids.length - 1];
    const result = shortestPath(start, end);
    expect(result).not.toBeNull();
    expect(result!.path[0]).toBe(start);
    expect(result!.path[result!.path.length - 1]).toBe(end);
  });
});
