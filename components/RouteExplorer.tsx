"use client";

import { useMemo, type ChangeEvent, type CSSProperties } from "react";
import { ElevationChart } from "@/components/ElevationChart";
import type { RouteAlternative, RouteKilometerMarker } from "@/types/route";

interface RouteExplorerProps {
  route?: RouteAlternative;
  activeDistance: number;
  activeElevation?: number;
  onDistanceChange: (distanceMeters: number) => void;
}

function markerPosition(marker: RouteKilometerMarker, totalDistance: number): number {
  if (totalDistance <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (marker.distanceMeters / totalDistance) * 100));
}

function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return "0 m";
  }
  if (meters >= 1000) {
    const km = meters / 1000;
    const decimals = km >= 10 ? 0 : 1;
    return `${km.toFixed(decimals)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function RouteExplorer({
  route,
  activeDistance,
  activeElevation,
  onDistanceChange,
}: RouteExplorerProps) {
  const totalDistance = route?.distanceMeters ?? 0;
  const percentage = totalDistance > 0 ? (activeDistance / totalDistance) * 100 : 0;
  const clampedPercentage = Number.isFinite(percentage) ? Math.min(Math.max(percentage, 0), 100) : 0;

  const sliderValue = Math.round(clampedPercentage * 10);

  const kilometerMarkers = useMemo(() => route?.kilometerMarkers ?? [], [route?.kilometerMarkers]);

  const sliderStyle = useMemo<CSSProperties>(
    () => ({
      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${clampedPercentage}%, #e5e7eb ${clampedPercentage}%, #e5e7eb 100%)`,
      accentColor: "#2563eb",
    }),
    [clampedPercentage],
  );

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!route || totalDistance <= 0) {
      return;
    }
    const value = Number(event.target.value) / 1000;
    const nextDistance = Math.min(Math.max(value * totalDistance, 0), totalDistance);
    onDistanceChange(nextDistance);
  };

  const distanceLabel = formatDistanceMeters(activeDistance);
  const elevationLabel =
    activeElevation != null && Number.isFinite(activeElevation)
      ? `${Math.round(activeElevation)} m`
      : "–";

  if (!route || totalDistance <= 0) {
    return (
      <div className="border-t border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        Generer en rute for å utforske traséen og høydeprofilen her.
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
        <span>
          Distanse: <span className="font-medium text-zinc-800">{distanceLabel}</span>
        </span>
        <span>
          Høyde: <span className="font-medium text-zinc-800">{elevationLabel}</span>
        </span>
      </div>

      <div className="relative mt-4 pb-6">
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="h-2 w-full appearance-none rounded-full"
          style={sliderStyle}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-5">
          {kilometerMarkers.map((marker) => {
            const position = markerPosition(marker, totalDistance);
            const tickClass =
              position <= 1
                ? "h-3 w-[1px] bg-blue-500"
                : position >= 99
                  ? "h-3 w-[1px] -translate-x-full bg-blue-500"
                  : "h-3 w-[1px] -translate-x-1/2 bg-blue-500";
            const labelClass =
              position <= 1
                ? "mt-1 whitespace-nowrap text-left text-[10px] font-medium text-blue-600"
                : position >= 99
                  ? "mt-1 -translate-x-full whitespace-nowrap text-right text-[10px] font-medium text-blue-600"
                  : "mt-1 -translate-x-1/2 whitespace-nowrap text-center text-[10px] font-medium text-blue-600";

            return (
              <div
                key={`${marker.label}-${marker.distanceMeters}`}
                className="absolute top-0"
                style={{ left: `${position}%` }}
              >
                <div className={tickClass} />
                <div className={labelClass}>{marker.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <ElevationChart
          profile={route.elevationProfile}
          activeDistance={activeDistance}
          onScrub={onDistanceChange}
        />
      </div>
    </div>
  );
}
