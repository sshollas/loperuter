'use client';

import { useState } from 'react';

const defaultStart = { lat: 59.91, lon: 10.75 };
const defaultEnd = { lat: 59.912, lon: 10.76 };

type Mode = 'roundtrip' | 'point2point';

export default function Home() {
  const [mode, setMode] = useState<Mode>('roundtrip');
  const [distance, setDistance] = useState(1000);
  const [tolerance, setTolerance] = useState(150);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        targetDistanceMeters: distance,
        distanceToleranceMeters: tolerance,
      };
      if (mode === 'roundtrip') {
        payload.start = defaultStart;
      } else {
        payload.start = defaultStart;
        payload.end = defaultEnd;
      }
      const res = await fetch(`/api/routes/${mode === 'roundtrip' ? 'roundtrip' : 'point2point'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? 'Unknown error');
      }
      setResult(await res.json());
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header>
        <h1>Løperuter Oslo</h1>
        <p>Rundturer og A→B-ruter basert på en forhåndsbygget graf fra OSM.</p>
      </header>

      <section>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={() => setMode('roundtrip')} style={{ opacity: mode === 'roundtrip' ? 1 : 0.5 }}>
            Rundtur
          </button>
          <button type="button" onClick={() => setMode('point2point')} style={{ opacity: mode === 'point2point' ? 1 : 0.5 }}>
            A → B
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Distanse (meter)
            <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} min={500} />
          </label>
          <label>
            Toleranse (meter)
            <input type="number" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} min={50} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Beregner…' : 'Beregn ruter'}
          </button>
        </form>
      </section>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
