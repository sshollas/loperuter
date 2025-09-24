'use client';

import type { RouteAlternative } from '@/types/route';

interface Props {
  alternative: RouteAlternative;
  index: number;
  onClick?: () => void;
  selected?: boolean;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds?: number, distanceMeters?: number): string {
  const duration = seconds ?? (distanceMeters ? (distanceMeters / 1000) * 330 : undefined);
  if (!duration) return '—';
  const mins = Math.floor(duration / 60);
  const secs = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function RouteSummary({ alternative, onClick, selected, index }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid rgba(0,0,0,0.1)',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        textAlign: 'left',
        background: selected ? 'rgba(37,99,235,0.08)' : 'white',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong>Alternativ {index + 1}</strong>
        <span>{formatDistance(alternative.distanceMeters)}</span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
        <span>Opp: {formatElevation(alternative.elevationGainMeters)}</span>
        <span>Ned: {formatElevation(alternative.elevationLossMeters)}</span>
        <span>Pace: {formatDuration(alternative.durationSeconds, alternative.distanceMeters)} /km</span>
      </div>
      {typeof alternative.overlapRatio === 'number' && (
        <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: '#6b7280' }}>
          Overlapp vs. baseline: {(alternative.overlapRatio * 100).toFixed(0)}%
        </div>
      )}
    </button>
  );
}
