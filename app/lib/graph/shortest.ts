import { loadGraph } from './loader';
import { GraphNode } from './types';
import { haversineMeters } from './util';

interface QueueNode {
  id: number;
  priority: number;
}

class MinHeap {
  private data: QueueNode[] = [];

  push(node: QueueNode) {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): QueueNode | undefined {
    if (this.data.length === 0) return undefined;
    const min = this.data[0];
    const end = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = end;
      this.bubbleDown(0);
    }
    return min;
  }

  private bubbleUp(idx: number) {
    const element = this.data[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.data[parentIdx];
      if (element.priority >= parent.priority) break;
      this.data[parentIdx] = element;
      this.data[idx] = parent;
      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number) {
    const length = this.data.length;
    const element = this.data[idx];
    while (true) {
      let leftIdx = idx * 2 + 1;
      let rightIdx = idx * 2 + 2;
      let swapIdx = -1;
      if (leftIdx < length && this.data[leftIdx].priority < element.priority) {
        swapIdx = leftIdx;
      }
      if (
        rightIdx < length &&
        this.data[rightIdx].priority < (swapIdx === -1 ? element.priority : this.data[leftIdx].priority)
      ) {
        swapIdx = rightIdx;
      }
      if (swapIdx === -1) break;
      this.data[idx] = this.data[swapIdx];
      this.data[swapIdx] = element;
      idx = swapIdx;
    }
  }
}

export interface PathResult {
  path: number[];
  distance: number;
}

export function shortestPath(startId: number, endId: number): PathResult | null {
  const { nodes, adjacency } = loadGraph();
  const open = new MinHeap();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();

  open.push({ id: startId, priority: 0 });
  gScore.set(startId, 0);
  const startNode = nodes.get(startId);
  const endNode = nodes.get(endId);
  if (!startNode || !endNode) return null;

  while (true) {
    const current = open.pop();
    if (!current) break;
    if (current.id === endId) {
      const path = reconstructPath(cameFrom, current.id);
      return { path, distance: gScore.get(current.id)! };
    }
    const neighbors = adjacency.get(current.id) ?? [];
    for (const neighbor of neighbors) {
      const tentative = gScore.get(current.id)! + neighbor.length;
      if (tentative < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, current.id);
        gScore.set(neighbor.to, tentative);
        const heuristic = haversineBetween(nodes.get(neighbor.to)!, endNode);
        fScore.set(neighbor.to, tentative + heuristic);
        open.push({ id: neighbor.to, priority: tentative + heuristic });
      }
    }
  }
  return null;
}

function haversineBetween(a: GraphNode, b: GraphNode): number {
  return haversineMeters(
    { lat: a.lat, lon: a.lon },
    { lat: b.lat, lon: b.lon }
  );
}

function reconstructPath(cameFrom: Map<number, number>, current: number): number[] {
  const totalPath = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    totalPath.unshift(current);
  }
  return totalPath;
}
