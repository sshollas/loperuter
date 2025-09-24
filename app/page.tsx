'use client';

import { useCallback, useMemo, useState } from 'react';
import Controls, { PointToPointFormState, RoundTripFormState } from '@/components/Controls';
import MapView from '@/components/Map';
import RouteSummary from '@/components/RouteSummary';
import ElevationChart from '@/components/ElevationChart';
import type { RouteAlternative, RouteResponse } from '@/types/route';

export type PlannerMode = 'roundtrip' | 'point2point';

const defaultRoundTrip: RoundTripFormState = {
  startAddress: '',
  startLat: '',
  startLng: '',
  targetDistanceKm: 10,
  toleranceMeters: 100,
  preferElevation: 'balanced',
};

const defaultPointToPoint: PointToPointFormState = {
  startAddress: '',
  startLat: '',
  startLng: '',
  endAddress: '',
  endLat: '',
  endLng: '',
  targetDistanceKm: 10,
  toleranceMeters: 100,
  preferElevation: 'balanced',
};

export default function HomePage() {
  const [mode, setMode] = useState<PlannerMode>('roundtrip');
  const [roundTripForm, setRoundTripForm] = useState<RoundTripFormState>(defaultRoundTrip);
  const [pointForm, setPointForm] = useState<PointToPointFormState>(defaultPointToPoint);
  const [response, setResponse] = useState<RouteResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formState = mode === 'roundtrip' ? roundTripForm : pointForm;

  const onFormChange = useCallback(
    (next: RoundTripFormState | PointToPointFormState) => {
      if (mode === 'roundtrip') {
        setRoundTripForm(next as RoundTripFormState);
      } else {
        setPointForm(next as PointToPointFormState);
      }
    },
    [mode],
  );

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = mode === 'roundtrip' ? '/api/routes/roundtrip' : '/api/routes/point2point';
      const body: any = {
        targetDistanceMeters: Math.round(formState.targetDistanceKm * 1000),
        distanceToleranceMeters: formState.toleranceMeters,
        preferElevation: formState.preferElevation,
      };
      if (formState.startAddress) {
        body.startAddress = formState.startAddress;
      }
      if (formState.startLat && formState.startLng) {
        body.start = { lat: Number(formState.startLat), lng: Number(formState.startLng) };
      }
      if (mode === 'point2point') {
        const pf = formState as PointToPointFormState;
        if (pf.endAddress) body.endAddress = pf.endAddress;
        if (pf.endLat && pf.endLng) {
          body.end = { lat: Number(pf.endLat), lng: Number(pf.endLng) };
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Server svarte ${res.status}`);
      }
      const data = (await res.json()) as RouteResponse;
      setResponse(data);
      setSelectedIndex(0);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setLoading(false);
    }
  }, [formState, mode]);

  const alternatives = useMemo(() => response?.alternatives ?? [], [response]);
  const selected = useMemo<RouteAlternative | null>(() => {
    if (!alternatives.length) return null;
    return alternatives[Math.min(selectedIndex, alternatives.length - 1)];
  }, [alternatives, selectedIndex]);

  return (
    <main>
      <div className="tab-bar">
        <button
          type="button"
          className={`tab ${mode === 'roundtrip' ? 'active' : ''}`}
          onClick={() => setMode('roundtrip')}
        >
          Rundtur
        </button>
        <button
          type="button"
          className={`tab ${mode === 'point2point' ? 'active' : ''}`}
          onClick={() => setMode('point2point')}
        >
          Punkt til punkt
        </button>
      </div>
      <div className="layout">
        <div className="sidebar">
          {response?.notes && response.notes.length > 0 && (
            <div className="status-banner">
              {response.notes.map((note) => (
                <div key={note}>{note}</div>
              ))}
            </div>
          )}
          <Controls
            mode={mode}
            value={formState}
            onChange={onFormChange}
            onSubmit={submit}
            loading={loading}
          />
          {error && (
            <p style={{ color: '#dc2626', marginTop: '1rem' }}>
              {error}
            </p>
          )}
          <div className="route-list" style={{ marginTop: '1.5rem' }}>
            {alternatives.map((route, index) => (
              <RouteSummary
                key={route.polyline + index}
                alternative={route}
                selected={index === selectedIndex}
                onClick={() => setSelectedIndex(index)}
                index={index}
              />
            ))}
          </div>
          {selected?.elevationProfile && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3>Høydeprofil</h3>
              <ElevationChart profile={selected.elevationProfile} />
            </div>
          )}
        </div>
        <div className="map-container">
          <MapView
            alternatives={alternatives}
            center={response?.center}
            bounds={response?.bounds}
            onRouteClick={(idx) => setSelectedIndex(idx)}
            selectedIndex={selectedIndex}
          />
        </div>
      </div>
    </main>
  );
}
