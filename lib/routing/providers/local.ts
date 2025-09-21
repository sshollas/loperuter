import { readFileSync } from "fs";
import polyline from "@mapbox/polyline";
import { computePathLength, haversineDistance } from "@/lib/geo/distance";
import type { LatLng } from "@/types/route";
import type { RoutingProvider, RoutingProviderRoute, RoutingProviderStep } from "../types";
import type { LocalGraphData } from "@/lib/routing/local/types";

interface LocalEdge {
  to: number;
  distance: number;
  name?: string | null;
}

interface NodeIndexEntry {
  id: number;
  lat: number;
  lng: number;
}

interface ProviderOptions {
  graphPath?: string;
  graphData?: LocalGraphData;
}

export class LocalRoutingProvider implements RoutingProvider {
  readonly name = "local-precomputed";

  readonly supportsRoundTrip = false;

  private readonly nodes: NodeIndexEntry[];

  private readonly adjacency: Map<number, LocalEdge[]>;

  private readonly edgeLookup: Map<string, LocalEdge>;

  constructor(options: ProviderOptions = {}) {
    const graph = options.graphData ?? loadGraphFromDisk(options.graphPath);
    this.nodes = graph.nodes.map((node) => ({ id: node.id, lat: node.lat, lng: node.lng }));
    this.adjacency = new Map();
    this.edgeLookup = new Map();

    for (const edge of graph.edges) {
      const entry: LocalEdge = { to: edge.to, distance: edge.distance, name: edge.name ?? null };
      const neighbors = this.adjacency.get(edge.from);
      if (neighbors) {
        neighbors.push(entry);
      } else {
        this.adjacency.set(edge.from, [entry]);
      }
      this.edgeLookup.set(edgeKey(edge.from, edge.to), entry);
    }
    if (this.nodes.length === 0) {
      throw new Error("Grafen inneholder ingen noder");
    }
  }

  async getRouteBetween(coordinates: LatLng[]): Promise<RoutingProviderRoute[]> {
    if (coordinates.length < 2) {
      throw new Error("Minst to koordinater kreves for å lage en rute");
    }

    const nodeSequence = coordinates.map((point) => this.findNearestNode(point));

    const pathNodes: number[] = [];
    for (let i = 1; i < nodeSequence.length; i += 1) {
      const segment = this.findShortestPath(nodeSequence[i - 1], nodeSequence[i]);
      if (segment.length === 0) {
        throw new Error("Fant ingen sti mellom to punkter i grafen");
      }
      if (pathNodes.length > 0) {
        segment.shift();
      }
      pathNodes.push(...segment);
    }

    const pathCoordinates = pathNodes.map((id) => this.getNode(id));
    const totalDistance = computePathLength(pathCoordinates);
    const encoded = polyline.encode(pathCoordinates.map((node) => [node.lat, node.lng]));
    const steps = buildSteps(pathNodes, this.edgeLookup, this.nodes);

    return [
      {
        polyline: encoded,
        coordinates: pathCoordinates,
        distanceMeters: totalDistance,
        steps,
      },
    ];
  }

  private getNode(id: number): LatLng {
    const node = this.nodes[id];
    if (!node) {
      throw new Error(`Node ${id} finnes ikke i grafen`);
    }
    return { lat: node.lat, lng: node.lng };
  }

  private findNearestNode(point: LatLng): number {
    let bestId = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const node of this.nodes) {
      const distance = haversineDistance(point, { lat: node.lat, lng: node.lng });
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = node.id;
      }
    }
    return bestId;
  }

  private findShortestPath(start: number, goal: number): number[] {
    if (start === goal) {
      return [start];
    }
    const distances = new Map<number, number>();
    const previous = new Map<number, number>();
    const queue = new MinPriorityQueue();

    distances.set(start, 0);
    queue.push({ id: start, distance: 0 });

    while (!queue.isEmpty()) {
      const current = queue.pop();
      if (!current) break;
      if (current.distance > (distances.get(current.id) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }
      if (current.id === goal) {
        break;
      }
      const neighbors = this.adjacency.get(current.id) ?? [];
      for (const edge of neighbors) {
        const tentative = current.distance + edge.distance;
        if (tentative < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
          distances.set(edge.to, tentative);
          previous.set(edge.to, current.id);
          queue.push({ id: edge.to, distance: tentative });
        }
      }
    }

    if (!distances.has(goal)) {
      return [];
    }

    const path: number[] = [];
    let current: number | undefined = goal;
    while (current !== undefined) {
      path.push(current);
      current = previous.get(current);
    }
    path.reverse();
    return path;
  }
}

function buildSteps(
  pathNodes: number[],
  edgeLookup: Map<string, LocalEdge>,
  nodes: NodeIndexEntry[],
): RoutingProviderStep[] {
  if (pathNodes.length < 2) {
    return [];
  }

  const steps: RoutingProviderStep[] = [];
  let currentName: string | null | undefined = undefined;
  let currentDistance = 0;
  let currentGeometry: LatLng[] = [];

  function flushStep() {
    if (currentGeometry.length < 2) {
      return;
    }
    steps.push({
      distanceMeters: currentDistance,
      name: currentName ?? undefined,
      geometry: currentGeometry,
    });
  }

  for (let i = 1; i < pathNodes.length; i += 1) {
    const from = pathNodes[i - 1];
    const to = pathNodes[i];
    const edge = edgeLookup.get(edgeKey(from, to));
    if (!edge) {
      throw new Error(`Mangler kantinformasjon fra ${from} til ${to}`);
    }
    const segmentGeometry = [nodes[from], nodes[to]].map((node) => ({
      lat: node.lat,
      lng: node.lng,
    }));

    const edgeName = edge.name ?? null;
    if (currentName === undefined) {
      currentName = edgeName;
      currentGeometry = [segmentGeometry[0], segmentGeometry[1]];
      currentDistance = edge.distance;
      continue;
    }

    if (edgeName === currentName) {
      currentGeometry.push(segmentGeometry[1]);
      currentDistance += edge.distance;
    } else {
      flushStep();
      currentName = edgeName;
      currentGeometry = [segmentGeometry[0], segmentGeometry[1]];
      currentDistance = edge.distance;
    }
  }

  flushStep();
  return steps;
}

interface QueueNode {
  id: number;
  distance: number;
}

class MinPriorityQueue {
  private heap: QueueNode[] = [];

  push(node: QueueNode) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): QueueNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const end = this.heap.pop();
    if (end && this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].distance <= this.heap[index].distance) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;
      if (left < length && this.heap[left].distance < this.heap[smallest].distance) {
        smallest = left;
      }
      if (right < length && this.heap[right].distance < this.heap[smallest].distance) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

function loadGraphFromDisk(path?: string): LocalGraphData {
  const graphPath = path ?? process.env.LOCAL_ROUTING_GRAPH_PATH ?? "server/data/localGraph.json";
  try {
    const buffer = readFileSync(graphPath, "utf8");
    return JSON.parse(buffer) as LocalGraphData;
  } catch (error) {
    throw new Error(
      `Kunne ikke laste forhåndsberegnet graf fra '${graphPath}': ${(error as Error).message}`,
    );
  }
}

function edgeKey(from: number, to: number): string {
  return `${from}->${to}`;
}
