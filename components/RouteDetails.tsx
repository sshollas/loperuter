"use client";

import type { RouteAlternative } from "@/types/route";

interface RouteDetailsProps {
  route?: RouteAlternative;
}

function formatMeters(meters: number) {
  if (meters >= 1000) {
    const km = meters / 1000;
    const decimals = km >= 10 ? 0 : 1;
    return `${km.toFixed(decimals)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatRange(startMeters: number, endMeters: number) {
  const startKm = startMeters / 1000;
  const endKm = endMeters / 1000;
  return `${startKm.toFixed(1)}–${endKm.toFixed(1)} km`;
}

function headingToText(degrees: number) {
  const labels = [
    "nord",
    "nordøst",
    "øst",
    "sørøst",
    "sør",
    "sørvest",
    "vest",
    "nordvest",
  ];
  const index = Math.round(degrees / 45) % labels.length;
  const label = labels[index] ?? labels[0];
  return `Mot ${label}`;
}

export function RouteDetails({ route }: RouteDetailsProps) {
  if (!route) {
    return null;
  }

  const segments = route.segments ?? [];
  const markers = route.kilometerMarkers ?? [];

  return (
    <div className="rounded border border-zinc-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-medium text-zinc-800">Rutebeskrivelse</h3>
      {segments.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Segmentinformasjon er tilgjengelig når ruten inneholder flere kilometerpunkter.
        </p>
      ) : (
        <ol className="mt-3 space-y-2 text-xs text-zinc-600">
          {segments.map((segment, index) => (
            <li
              key={`${segment.startDistanceMeters}-${segment.endDistanceMeters}`}
              className="rounded border border-zinc-100 bg-zinc-50 p-2"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-500">
                <span>Del {index + 1}</span>
                <span>{formatMeters(segment.lengthMeters)}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-700">
                {headingToText(segment.headingDegrees)}
              </div>
              <div className="text-[11px] text-zinc-500">
                {formatRange(segment.startDistanceMeters, segment.endDistanceMeters)} • {Math.round(segment.headingDegrees)}°
              </div>
            </li>
          ))}
        </ol>
      )}

      {markers.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-zinc-500">Kilometerpunkter</h4>
          <div className="mt-2 flex flex-wrap gap-2">
              {markers.map((marker) => (
                <span
                  key={`${marker.label}-${marker.distanceMeters}`}
                  className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700"
                >
                  <span>{marker.label}</span>
                  <span className="text-[10px] font-normal text-blue-500">{formatMeters(marker.distanceMeters)}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
