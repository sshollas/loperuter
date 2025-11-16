import { unique } from './util';

export function overlapRatio(pathA: number[], pathB: number[]): number {
  const edgesA = pathToEdges(pathA);
  const edgesB = new Set(pathToEdges(pathB));
  if (edgesA.length === 0) return 0;
  const overlap = edgesA.filter((edge) => edgesB.has(edge)).length;
  return overlap / edgesA.length;
}

function pathToEdges(path: number[]): string[] {
  const edges: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    edges.push([Math.min(a, b), Math.max(a, b)].join('-'));
  }
  return unique(edges);
}
