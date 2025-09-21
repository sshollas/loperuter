"use client";

import { useEffect, useMemo, useState } from "react";
import { Controls, ControlsValues, Mode } from "@/components/Controls";
import { MapView } from "@/components/Map";
import { RouteSummary } from "@/components/RouteSummary";
import { RouteDetails } from "@/components/RouteDetails";
import { RouteExplorer } from "@/components/RouteExplorer";
import { decodePolyline, encodePolyline } from "@/lib/geo/utils";
import { cumulativeDistances, interpolatePoint } from "@/lib/geo/distance";
import { elevationAtDistance } from "@/lib/elevation/profile";
import type { LatLng, RouteAlternative, RouteResponse } from "@/types/route";

const DEFAULT_VALUES: ControlsValues = {
  startAddress: "Karl Johans gate 1, Oslo",
  endAddress: "Dronning Eufemias gate 16, Oslo",
  targetDistanceKm: 10,
  toleranceMeters: 100,
  preferElevation: "balanced",
};

const COLORS = ["#2563eb", "#38bdf8", "#f97316", "#22c55e", "#a855f7"];

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("roundtrip");
  const [values, setValues] = useState<ControlsValues>(DEFAULT_VALUES);
  const [alternatives, setAlternatives] = useState<RouteAlternative[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLng | undefined>();
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | undefined>();
  const [activeDistance, setActiveDistance] = useState(0);

  const selectedRoute = alternatives[selectedIndex];

  const selectedRoutePath = useMemo(
    () => (selectedRoute ? decodePolyline(selectedRoute.polyline) : []),
    [selectedRoute],
  );

  const selectedRouteDistances = useMemo(
    () => (selectedRoutePath.length > 0 ? cumulativeDistances(selectedRoutePath) : []),
    [selectedRoutePath],
  );

  useEffect(() => {
    setActiveDistance(0);
  }, [selectedRoute?.polyline]);

  const mapRoutes = useMemo(
    () =>
      alternatives.map((alt, index) => ({
        id: `alt-${index}`,
        polyline: alt.polyline,
        color: COLORS[index % COLORS.length],
        width: index === selectedIndex ? 6 : 3,
        active: index === selectedIndex,
      })),
    [alternatives, selectedIndex],
  );

  const totalDistance = selectedRoute?.distanceMeters ?? 0;
  const clampedDistance = useMemo(() => {
    if (!selectedRoute || totalDistance <= 0) {
      return 0;
    }
    return Math.min(Math.max(activeDistance, 0), totalDistance);
  }, [activeDistance, selectedRoute, totalDistance]);

  const activeCoordinate = useMemo(() => {
    if (!selectedRoute || selectedRoutePath.length === 0 || selectedRouteDistances.length === 0) {
      return undefined;
    }
    return interpolatePoint(selectedRoutePath, selectedRouteDistances, clampedDistance);
  }, [clampedDistance, selectedRoute, selectedRouteDistances, selectedRoutePath]);

  const activeElevation = useMemo(() => {
    if (!selectedRoute?.elevationProfile || selectedRoute.elevationProfile.length === 0) {
      return undefined;
    }
    return elevationAtDistance(selectedRoute.elevationProfile, clampedDistance);
  }, [clampedDistance, selectedRoute]);

  const activeProgress = useMemo(() => {
    if (!selectedRoute || selectedRoutePath.length === 0 || selectedRouteDistances.length === 0) {
      return undefined;
    }
    if (clampedDistance <= 0) {
      return undefined;
    }

    const coords: LatLng[] = [];
    for (let i = 0; i < selectedRoutePath.length; i += 1) {
      const distance = selectedRouteDistances[i] ?? 0;
      const point = selectedRoutePath[i];
      if (coords.length === 0) {
        coords.push(point);
      }
      if (distance < clampedDistance) {
        if (i > 0) {
          coords.push(point);
        }
        continue;
      }

      if (distance === clampedDistance) {
        coords.push(point);
      } else if (i > 0) {
        const prevDistance = selectedRouteDistances[i - 1] ?? 0;
        const prevPoint = selectedRoutePath[i - 1];
        const span = distance - prevDistance;
        const ratio = span <= 0 ? 0 : (clampedDistance - prevDistance) / span;
        coords.push({
          lat: prevPoint.lat + (point.lat - prevPoint.lat) * ratio,
          lng: prevPoint.lng + (point.lng - prevPoint.lng) * ratio,
        });
      }
      break;
    }

    if (coords.length < 2) {
      return undefined;
    }

    const activeRoute = mapRoutes[selectedIndex];
    return {
      polyline: encodePolyline(coords),
      color: activeRoute?.color,
    };
  }, [clampedDistance, mapRoutes, selectedIndex, selectedRoute, selectedRouteDistances, selectedRoutePath]);

  const requestBody = () => {
    const targetDistanceMeters = Math.round(values.targetDistanceKm * 1000);
    const basePayload = {
      startAddress: values.startAddress,
      targetDistanceMeters,
      distanceToleranceMeters: values.toleranceMeters,
      preferElevation: values.preferElevation,
    };
    if (mode === "roundtrip") {
      return basePayload;
    }
    return {
      ...basePayload,
      endAddress: values.endAddress,
    };
  };

  const endpoint = mode === "roundtrip" ? "/api/routes/roundtrip" : "/api/routes/point2point";

  const handleSubmit = async () => {
    setError(null);
    if (!values.startAddress || (mode === "point2point" && !values.endAddress)) {
      setError("Vennligst fyll inn både start- og sluttadresse.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody()),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Ukjent feil fra server");
      }
      const data = (await response.json()) as RouteResponse;
      setAlternatives(data.alternatives);
      setSelectedIndex(0);
      setNotes(data.notes ?? []);
      setMapCenter(data.center);
      setMapBounds(data.bounds);
    } catch (submitError) {
      setAlternatives([]);
      setSelectedIndex(0);
      setNotes([]);
      setMapCenter(undefined);
      setMapBounds(undefined);
      setError(submitError instanceof Error ? submitError.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Løperuter</h1>
            <p className="text-sm text-zinc-600">
              Utforsk flere løperuter med kontroll på distanse og stigning.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
        <aside className="w-full max-w-md space-y-6">
          <Controls
            mode={mode}
            values={values}
            loading={loading}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "roundtrip") {
                setValues((prev) => ({ ...prev }));
              }
            }}
            onChange={(update) => setValues((prev) => ({ ...prev, ...update }))}
            onSubmit={handleSubmit}
            onSwapPoints={
              mode === "point2point"
                ? () =>
                    setValues((prev) => ({
                      ...prev,
                      startAddress: prev.endAddress,
                      endAddress: prev.startAddress,
                    }))
                : undefined
            }
          />
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {notes.length > 0 && (
            <ul className="space-y-1 text-xs text-zinc-500">
              {notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          )}
          <RouteSummary
            alternatives={alternatives}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
          <RouteDetails route={selectedRoute} />
        </aside>

        <section className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow">
          <div className="h-[600px] w-full">
            <MapView
              center={mapCenter}
              bounds={mapBounds}
              routes={mapRoutes}
              kilometerMarkers={selectedRoute?.kilometerMarkers}
              activeMarker={
                activeCoordinate
                  ? {
                      coordinate: activeCoordinate,
                      color: mapRoutes[selectedIndex]?.color,
                    }
                  : undefined
              }
              activeProgress={activeProgress}
            />
          </div>
          <RouteExplorer
            route={selectedRoute}
            activeDistance={clampedDistance}
            activeElevation={activeElevation}
            onDistanceChange={setActiveDistance}
          />
        </section>
      </div>
    </main>
  );
}
