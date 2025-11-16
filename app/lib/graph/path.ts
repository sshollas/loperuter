import polyline from '@mapbox/polyline';
import { loadGraph } from './loader';
import { LatLng } from './types';

export function pathToCoordinates(path: number[]): LatLng[] {
  const { nodes } = loadGraph();
  return path.map((id) => {
    const node = nodes.get(id);
    if (!node) throw new Error(`Missing node ${id}`);
    return { lat: node.lat, lon: node.lon };
  });
}

export function encodePath(path: number[]): string {
  const coords = pathToCoordinates(path).map((p) => [p.lat, p.lon]);
  return polyline.encode(coords, 6);
}

export function pathDistance(path: number[]): number {
  const { adjacency } = loadGraph();
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const neighbors = adjacency.get(from) ?? [];
    const edge = neighbors.find((n) => n.to === to);
    if (!edge) throw new Error('Broken path');
    distance += edge.length;
  }
  return distance;
}
