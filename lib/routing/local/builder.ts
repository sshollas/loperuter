import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import { haversineDistance } from "@/lib/geo/distance";
import type { LocalGraphData, LocalGraphEdge, LocalGraphNode } from "./types";

const DEFAULT_DISALLOWED_HIGHWAYS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "service",
]);

function isLineString(
  feature: Feature,
): feature is Feature<LineString | MultiLineString> {
  return (
    feature.geometry?.type === "LineString" || feature.geometry?.type === "MultiLineString"
  );
}

interface BuildOptions {
  disallowedHighways?: Set<string>;
  minimumSegmentLengthMeters?: number;
  sourceName?: string;
}

export function buildLocalGraph(
  collection: FeatureCollection,
  options: BuildOptions = {},
): LocalGraphData {
  const disallowed = options.disallowedHighways ?? DEFAULT_DISALLOWED_HIGHWAYS;
  const minLength = options.minimumSegmentLengthMeters ?? 1;

  const nodes: LocalGraphNode[] = [];
  const nodeIndex = new Map<string, number>();
  const edges: LocalGraphEdge[] = [];
  const edgeKeys = new Set<string>();

  let minLat = Number.POSITIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  function registerNode(lat: number, lng: number): number {
    const precision = 1e6;
    const key = `${Math.round(lat * precision)}:${Math.round(lng * precision)}`;
    const existing = nodeIndex.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const id = nodes.length;
    nodes.push({ id, lat, lng });
    nodeIndex.set(key, id);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    return id;
  }

  function registerEdge(from: number, to: number, distance: number, name?: string | null) {
    if (distance < minLength) {
      return;
    }
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) {
      return;
    }
    edgeKeys.add(key);
    edges.push({ from, to, distance, name: name ?? null });
  }

  for (const feature of collection.features) {
    if (!isLineString(feature)) continue;
    const highway = feature.properties?.highway as string | undefined;
    if (highway && disallowed.has(highway)) {
      continue;
    }
    const name = (feature.properties?.name as string | undefined) ?? null;

    const coordinates = feature.geometry.type === "LineString"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat(1);

    for (let i = 1; i < coordinates.length; i += 1) {
      const [prevLng, prevLat] = coordinates[i - 1];
      const [lng, lat] = coordinates[i];
      const startId = registerNode(prevLat, prevLng);
      const endId = registerNode(lat, lng);
      const distance = haversineDistance({ lat: prevLat, lng: prevLng }, { lat, lng });
      registerEdge(startId, endId, distance, name);
      registerEdge(endId, startId, distance, name);
    }
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) {
    throw new Error("Fant ingen gyldige segmenter i GeoJSON-dataene");
  }

  return {
    metadata: {
      bbox: [minLng, minLat, maxLng, maxLat],
      generatedAt: new Date().toISOString(),
      source: options.sourceName ?? "unknown",
      notes: "Generated from GeoJSON walkway data",
    },
    nodes,
    edges,
  };
}
