export interface LocalGraphNode {
  id: number;
  lat: number;
  lng: number;
}

export interface LocalGraphEdge {
  from: number;
  to: number;
  distance: number;
  name?: string | null;
}

export interface LocalGraphMetadata {
  bbox: [number, number, number, number];
  generatedAt: string;
  source?: string;
  notes?: string;
}

export interface LocalGraphData {
  metadata: LocalGraphMetadata;
  nodes: LocalGraphNode[];
  edges: LocalGraphEdge[];
}
