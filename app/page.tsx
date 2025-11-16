'use client';

import { FormEvent, useState } from 'react';
import dynamic from 'next/dynamic';

import type { RouteResponse } from './lib/graph/types';

const RouteMap = dynamic<{ result: RouteResponse | null }>(() => import('./components/RouteMap'), {
  ssr: false,
  loading: () => <div className="map-shell">Laster kart…</div>,
});

type Mode = 'roundtrip' | 'point2point';

type ElevPref = 'min' | 'balanced' | 'max';

const defaultRoundtrip = 'Stortorvet 2, Oslo';
const defaultPointToPointEnd = 'Jernbanetorget 1, Oslo';

const demoResult: RouteResponse = {
  alternatives: [
    {
      polyline: '_vrgqB_bcoSg^owHg^owHf^nwHf^nwH',
      distanceMeters: 1400,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      overlapRatio: 1,
      estimatedTimeSeconds: 504,
    },
    {
      polyline: '_vrgqB_bcoSw|AnwHo}@owHn}@nwHv|AowH',
      distanceMeters: 1400,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      overlapRatio: 1,
      estimatedTimeSeconds: 504,
    },
  ],
  center: { lat: 59.91125, lon: 10.7525 },
  bounds: [
    [59.91, 10.745],
    [59.9125, 10.76],
  ],
  notes: ['Demo-data basert på sample-grafen i data/.'],
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('roundtrip');
  const [distance, setDistance] = useState(10000);
  const [tolerance, setTolerance] = useState(150);
  const [startAddress, setStartAddress] = useState(defaultRoundtrip);
  const [endAddress, setEndAddress] = useState(defaultPointToPointEnd);
  const [preferElevation, setPreferElevation] = useState<ElevPref>('balanced');
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startAddress.trim()) {
      setError('Oppgi en startadresse i Oslo.');
      return;
    }
    if (mode === 'point2point' && !endAddress.trim()) {
      setError('Oppgi en måladresse for A→B-ruter.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        targetDistanceMeters: distance,
        distanceToleranceMeters: tolerance,
        preferElevation,
        startAddress: startAddress.trim(),
      };
      if (mode === 'point2point') {
        payload.endAddress = endAddress.trim();
      }
      const res = await fetch(`/api/routes/${mode === 'roundtrip' ? 'roundtrip' : 'point2point'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RouteResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Ukjent feil');
      }
      setResult(data);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => `${(meters / 1000).toFixed(2)} km`;

  const alternatives = result?.alternatives ?? [];
  const notes = result?.notes ?? [];

  const loadDemo = () => {
    setError(null);
    setResult(demoResult);
  };

  return (
    <main>
      <header>
        <h1>Løperuter Oslo</h1>
        <p>Beregn nye løpeopplevelser i Oslo med en forhåndsbygget graf fra OpenStreetMap.</p>
      </header>

      <section className="panel">
        <div className="mode-toggle">
          <button type="button" onClick={() => setMode('roundtrip')} className={mode === 'roundtrip' ? 'active' : ''}>
            Rundtur
          </button>
          <button type="button" onClick={() => setMode('point2point')} className={mode === 'point2point' ? 'active' : ''}>
            A → B
          </button>
        </div>
        <form onSubmit={handleSubmit} className="controls">
          <label>
            Startadresse
            <input
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="Adresse eller lat,lon"
            />
          </label>
          {mode === 'point2point' && (
            <label>
              Sluttadresse
              <input
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                placeholder="Adresse eller lat,lon"
              />
            </label>
          )}
          <label>
            Ønsket distanse (meter)
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              min={1000}
              step={500}
            />
          </label>
          <label>
            Toleranse (meter)
            <input
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              min={50}
              step={50}
            />
          </label>
          <label>
            Stigningspreferanse
            <select value={preferElevation} onChange={(e) => setPreferElevation(e.target.value as ElevPref)}>
              <option value="min">Minimer</option>
              <option value="balanced">Balansert</option>
              <option value="max">Maksimer</option>
            </select>
          </label>
          <button type="submit" disabled={loading} className="submit">
            {loading ? 'Beregner…' : 'Beregn ruter'}
          </button>
          <button type="button" className="ghost" onClick={loadDemo}>
            Vis demo
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="content">
        <div className="map-panel">
          <RouteMap result={result} />
        </div>
        <div className="routes-panel">
          <h2>Forslag</h2>
          {alternatives.length === 0 && <p>Send inn en forespørsel for å se ruter og kart.</p>}
          <div className="routes-list">
            {alternatives.map((alt, idx) => (
              <article key={`alt-${idx}`}>
                <header>
                  <h3>Rute {idx + 1}</h3>
                  <span>{formatDistance(alt.distanceMeters)}</span>
                </header>
                <dl>
                  <div>
                    <dt>Stigning</dt>
                    <dd>{Math.round(alt.elevationGainMeters)} m opp / {Math.round(alt.elevationLossMeters)} m ned</dd>
                  </div>
                  {typeof alt.overlapRatio === 'number' && (
                    <div>
                      <dt>Overlapp</dt>
                      <dd>{Math.round(alt.overlapRatio * 100)}%</dd>
                    </div>
                  )}
                  {typeof alt.estimatedTimeSeconds === 'number' && (
                    <div>
                      <dt>Tid</dt>
                      <dd>{Math.round(alt.estimatedTimeSeconds / 60)} min</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
          {notes.length > 0 && (
            <ul className="notes">
              {notes.map((note, idx) => (
                <li key={`note-${idx}`}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
