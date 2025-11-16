import { LatLng } from './types';
import { loadGraph } from './loader';
import { haversineMeters } from './util';

export function nearestNode(point: LatLng) {
  const { nodes } = loadGraph();
  let best = null as null | { id: number; distance: number };
  for (const node of nodes.values()) {
    const dist = haversineMeters(point, { lat: node.lat, lon: node.lon });
    if (!best || dist < best.distance) {
      best = { id: node.id, distance: dist };
    }
  }
  if (!best) throw new Error('Graph contains no nodes');
  return nodes.get(best.id)!;
}

export function nearestNodeId(point: LatLng): number {
  return nearestNode(point).id;
}
