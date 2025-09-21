"use client";

import { useMemo } from "react";

interface Point {
  distance: number;
  elevation: number;
}

interface ElevationChartProps {
  profile?: Point[];
}

function formatDistance(meters: number) {
  if (meters >= 1000) {
    const km = meters / 1000;
    const decimals = km >= 10 ? 0 : 1;
    return `${km.toFixed(decimals)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function ElevationChart({ profile }: ElevationChartProps) {
  const chart = useMemo(() => {
    if (!profile || profile.length === 0) return null;
    const distances = profile.map((p) => p.distance);
    const elevations = profile.map((p) => p.elevation);
    const totalDist = distances[distances.length - 1] || 1;
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const range = maxElev - minElev || 1;
    const normalizeElevation = (value: number) =>
      range === 0 ? 50 : ((value - minElev) / range) * 80 + 10;

    const points = profile.map((point) => {
      const x = (point.distance / totalDist) * 100;
      const y = 100 - normalizeElevation(point.elevation);
      return `${x},${y}`;
    });

    const spacingCandidates = [1000, 500, 250, 100];
    const approxSpacing = totalDist / 6;
    const spacing =
      spacingCandidates.find((candidate) => approxSpacing >= candidate) ??
      spacingCandidates[spacingCandidates.length - 1];

    const xTicks: { label: string; x: number }[] = [];
    for (let d = 0; d <= totalDist; d += spacing) {
      const x = (d / totalDist) * 100;
      xTicks.push({ label: formatDistance(d), x });
    }
    if (xTicks.length === 0 || xTicks[xTicks.length - 1]?.x < 100) {
      xTicks.push({ label: formatDistance(totalDist), x: 100 });
    }

    const yTicks: { label: string; y: number }[] = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i += 1) {
      const value = minElev + (range / tickCount) * i;
      const y = 100 - normalizeElevation(value);
      yTicks.push({ label: `${Math.round(value)} m`, y });
    }

    return {
      path: `0,100 ${points.join(" ")} 100,100`,
      totalDist,
      minElev,
      maxElev,
      xTicks,
      yTicks,
    };
  }, [profile]);

  const totals = useMemo(() => {
    if (!profile || profile.length < 2) {
      return { gain: 0, loss: 0 };
    }
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < profile.length; i += 1) {
      const delta = profile[i].elevation - profile[i - 1].elevation;
      if (delta > 0) gain += delta;
      else loss += Math.abs(delta);
    }
    return { gain, loss };
  }, [profile]);

  if (!profile || profile.length === 0 || !chart) {
    return (
      <div className="rounded border border-dashed border-zinc-300 p-4 text-xs text-zinc-500">
        Høydeprofil vises når en rute er valgt.
      </div>
    );
  }

  const averageGrade = chart.totalDist > 0 ? (totals.gain / chart.totalDist) * 100 : 0;

  return (
    <div className="rounded border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
        <span>Laveste: {chart.minElev.toFixed(0)} m</span>
        <span>Høyeste: {chart.maxElev.toFixed(0)} m</span>
        <span>Opp: {Math.round(totals.gain)} m • Ned: {Math.round(totals.loss)} m</span>
        <span>Snittstigning: {averageGrade.toFixed(1)} %</span>
      </div>
      <svg viewBox="0 0 100 100" className="mt-3 h-36 w-full">
        <defs>
          <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.55)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.05)" />
          </linearGradient>
        </defs>
        {chart.yTicks.map((tick) => (
          <g key={`y-${tick.label}`}>
            <line
              x1={0}
              x2={100}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth={0.4}
            />
            <text x={1} y={tick.y - 1} fontSize={3} fill="#64748b">
              {tick.label}
            </text>
          </g>
        ))}
        {chart.xTicks.map((tick) => (
          <g key={`x-${tick.x}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={95}
              y2={100}
              stroke="rgba(148, 163, 184, 0.4)"
              strokeWidth={0.6}
            />
            <text x={tick.x} y={99.5} fontSize={3} fill="#475569" textAnchor="middle">
              {tick.label}
            </text>
          </g>
        ))}
        <polygon points={chart.path} fill="url(#elevation-fill)" stroke="rgba(37, 99, 235, 0.8)" strokeWidth={0.8} />
      </svg>
    </div>
  );
}
