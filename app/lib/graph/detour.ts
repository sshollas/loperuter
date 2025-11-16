import { nearestNodeId } from './spatial';
import { PointToPointRequest, RouteAlternative } from './types';
import { shortestPath } from './shortest';
import { encodePath } from './path';
import { overlapRatio } from './overlap';
import { loadGraph } from './loader';

export function buildDetours(request: PointToPointRequest): RouteAlternative[] {
  if (!request.start || !request.end) throw new Error('start and end required');
  const startId = nearestNodeId(request.start);
  const endId = nearestNodeId(request.end);
  const tolerance = request.distanceToleranceMeters ?? 150;
  const baseline = shortestPath(startId, endId);
  if (!baseline) throw new Error('no baseline path');
  const baselineDistance = baseline.distance;

  const target = request.targetDistanceMeters;
  if (Math.abs(baselineDistance - target) <= tolerance) {
    return [
      {
        polyline: encodePath(baseline.path),
        distanceMeters: baselineDistance,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
        overlapRatio: 0,
      },
    ];
  }

  const deficit = target - baselineDistance;
  if (deficit <= 0) {
    return [
      {
        polyline: encodePath(baseline.path),
        distanceMeters: baselineDistance,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
        overlapRatio: 0.5,
        estimatedTimeSeconds: Math.round((baselineDistance / 1000 / 10) * 3600),
      },
    ];
  }

  const segments = splitPath(baseline.path, 4);
  const candidates: RouteAlternative[] = [];
  for (const segmentNode of segments) {
    const loops = sampleLoops(segmentNode, deficit, tolerance);
    for (const loop of loops) {
      const combinedPath = combineLoop(baseline.path, segmentNode, loop.path);
      const totalDistance = baselineDistance + loop.distance;
      if (Math.abs(totalDistance - target) > tolerance) continue;
      candidates.push({
        polyline: encodePath(combinedPath),
        distanceMeters: totalDistance,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
        overlapRatio: overlapRatio(baseline.path, combinedPath),
      });
    }
  }
  candidates.sort((a, b) => {
    const d = Math.abs(a.distanceMeters - target) - Math.abs(b.distanceMeters - target);
    if (d !== 0) return d;
    return (a.overlapRatio ?? 0) - (b.overlapRatio ?? 0);
  });
  return candidates.slice(0, 3);
}

function splitPath(path: number[], segments: number): number[] {
  if (segments <= 1) return path;
  const step = Math.max(1, Math.floor(path.length / segments));
  const picks: number[] = [];
  for (let i = step; i < path.length - 1; i += step) {
    picks.push(path[i]);
  }
  return picks;
}

function sampleLoops(anchorNodeId: number, deficit: number, tolerance: number) {
  const loops: { path: number[]; distance: number }[] = [];
  const { adjacency } = loadGraph();
  const visited = new Set<number>();
  function dfs(nodeId: number, path: number[], distance: number) {
    if (distance >= deficit + tolerance) return;
    if (distance >= deficit - tolerance && nodeId === anchorNodeId && path.length > 1) {
      loops.push({ path: [...path], distance });
      return;
    }
    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      const edgeLength = neighbor.length;
      const nextNode = neighbor.to;
      const pathKey = `${nodeId}-${nextNode}`;
      if (visited.has(nextNode)) continue;
      visited.add(nextNode);
      path.push(nextNode);
      dfs(nextNode, path, distance + edgeLength);
      path.pop();
      visited.delete(nextNode);
    }
  }
  dfs(anchorNodeId, [anchorNodeId], 0);
  return loops.slice(0, 5);
}

function combineLoop(basePath: number[], anchor: number, loop: number[]): number[] {
  const anchorIndex = basePath.indexOf(anchor);
  if (anchorIndex === -1) return basePath;
  const before = basePath.slice(0, anchorIndex + 1);
  const after = basePath.slice(anchorIndex + 1);
  const reversedLoop = [...loop].reverse().slice(1);
  return [...before, ...loop.slice(1), ...reversedLoop, ...after];
}
