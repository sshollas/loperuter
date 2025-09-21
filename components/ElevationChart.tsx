"use client";

import { useMemo } from "react";

interface Point {
  distance: number;
  elevation: number;
}

interface ElevationChartProps {
  profile?: Point[];
}

export function ElevationChart({ profile }: ElevationChartProps) {
  const path = useMemo(() => {
    if (!profile || profile.length === 0) return null;
    const distances = profile.map((p) => p.distance);
    const elevations = profile.map((p) => p.elevation);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const totalDist = distances[distances.length - 1] || 1;
    const normalizeElevation = (value: number) =>
      maxElev === minElev ? 50 : ((value - minElev) / (maxElev - minElev)) * 80 + 10;

    const points = profile.map((point) => {
      const x = (point.distance / totalDist) * 100;
      const y = 100 - normalizeElevation(point.elevation);
      return `${x},${y}`;
    });
    return `0,100 ${points.join(" ")} 100,100`;
  }, [profile]);

  if (!profile || profile.length === 0 || !path) {
    return (
      <div className="rounded border border-dashed border-zinc-300 p-4 text-xs text-zinc-500">
        Høydeprofil vises når en rute er valgt.
      </div>
    );
  }

  const minElev = Math.min(...profile.map((p) => p.elevation));
  const maxElev = Math.max(...profile.map((p) => p.elevation));

  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Laveste: {minElev.toFixed(0)} m</span>
        <span>Høyeste: {maxElev.toFixed(0)} m</span>
      </div>
      <svg viewBox="0 0 100 100" className="mt-2 h-32 w-full">
        <polygon points={path} fill="rgba(37, 99, 235, 0.35)" stroke="rgba(37, 99, 235, 0.7)" strokeWidth={0.5} />
      </svg>
    </div>
  );
}
