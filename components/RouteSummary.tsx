"use client";

import type { RouteAlternative } from "@/types/route";

interface RouteSummaryProps {
  alternatives: RouteAlternative[];
  selectedIndex: number;
  onSelect(index: number): void;
}

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number) {
  return `${meters.toFixed(0)} m`;
}

function formatTime(seconds?: number) {
  if (!seconds) return "–";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0) {
    return `${hours} t ${remaining} min`;
  }
  return `${remaining} min`;
}

export function RouteSummary({ alternatives, selectedIndex, onSelect }: RouteSummaryProps) {
  if (alternatives.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
        Ingen ruter generert ennå. Søk etter en rute for å komme i gang.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alternatives.map((alt, index) => {
        const active = index === selectedIndex;
        return (
          <button
            key={alt.polyline}
            type="button"
            className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
              active
                ? "border-blue-500 bg-blue-50 shadow"
                : "border-zinc-200 hover:border-blue-300"
            }`}
            onClick={() => onSelect(index)}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
              <span>Alternativ {index + 1}</span>
              <span>{formatTime(alt.estimatedTimeSeconds)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-zinc-900">
                  {formatDistance(alt.distanceMeters)}
                </div>
                <div className="text-xs text-zinc-500">
                  Opp: {formatElevation(alt.elevationGainMeters)} • Ned: {formatElevation(alt.elevationLossMeters)}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
