import { loadGraph } from './loader';

export function distancesFrom(startId: number): Map<number, number> {
  const { adjacency } = loadGraph();
  const dist = new Map<number, number>();
  const visited = new Set<number>();
  const queue: Array<[number, number]> = [[startId, 0]];

  while (queue.length > 0) {
    queue.sort((a, b) => a[1] - b[1]);
    const [nodeId, d] = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    dist.set(nodeId, d);
    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      const newDist = d + neighbor.length;
      if (newDist < (dist.get(neighbor.to) ?? Infinity)) {
        dist.set(neighbor.to, newDist);
        queue.push([neighbor.to, newDist]);
      }
    }
  }
  return dist;
}
