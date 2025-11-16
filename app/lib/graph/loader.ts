import fs from 'node:fs';
import path from 'node:path';

import { GraphNode, GraphEdge, AdjacentEdge } from './types';

export interface GraphData {
  nodes: Map<number, GraphNode>;
  adjacency: Map<number, AdjacentEdge[]>;
  bounds: [[number, number], [number, number]];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const NODE_CANDIDATES = ['nodes.parquet', 'nodes.json', 'nodes.sample.json'];
const EDGE_CANDIDATES = ['edges.parquet', 'edges.json', 'edges.sample.json'];

let cachedGraph: GraphData | null = null;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function loadNodes(): GraphNode[] {
  for (const candidate of NODE_CANDIDATES) {
    const full = path.join(DATA_DIR, candidate);
    if (fs.existsSync(full) && candidate.endsWith('.json')) {
      const nodes = readJson<any[]>(full);
      return nodes.map((n) => ({
        id: Number(n.id),
        lat: Number(n.lat),
        lon: Number(n.lon),
        elevation: Number(n.elevation_m ?? 0),
      }));
    }
  }
  throw new Error('No nodes data found. Run graph-builder first.');
}

function loadEdges(): GraphEdge[] {
  for (const candidate of EDGE_CANDIDATES) {
    const full = path.join(DATA_DIR, candidate);
    if (fs.existsSync(full) && candidate.endsWith('.json')) {
      const edges = readJson<any[]>(full);
      return edges.map((e, idx) => ({
        id: Number(e.id ?? idx),
        u: Number(e.u),
        v: Number(e.v),
        length: Number(e.length_m ?? e.length ?? 0),
        gain: Number(e.gain_m ?? 0),
        loss: Number(e.loss_m ?? 0),
      }));
    }
  }
  throw new Error('No edges data found. Run graph-builder first.');
}

export function loadGraph(): GraphData {
  if (cachedGraph) {
    return cachedGraph;
  }
  const nodes = loadNodes();
  const edges = loadEdges();

  const nodeMap = new Map<number, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const adjacency = new Map<number, AdjacentEdge[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.u)) adjacency.set(edge.u, []);
    adjacency.get(edge.u)!.push({ to: edge.v, length: edge.length, edgeId: edge.id });
    if (!adjacency.has(edge.v)) adjacency.set(edge.v, []);
    adjacency.get(edge.v)!.push({ to: edge.u, length: edge.length, edgeId: edge.id });
  }

  const lats = nodes.map((n) => n.lat);
  const lons = nodes.map((n) => n.lon);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  cachedGraph = { nodes: nodeMap, adjacency, bounds };
  return cachedGraph;
}
