'use client';

import { ChangeEvent } from 'react';
import type { PlannerMode } from '@/app/page';

export interface BaseFormState {
  startAddress: string;
  startLat: string;
  startLng: string;
  targetDistanceKm: number;
  toleranceMeters: number;
  preferElevation: 'min' | 'balanced' | 'max';
}

export interface RoundTripFormState extends BaseFormState {}

export interface PointToPointFormState extends BaseFormState {
  endAddress: string;
  endLat: string;
  endLng: string;
}

type InputField = keyof RoundTripFormState | keyof PointToPointFormState;

type Props = {
  mode: PlannerMode;
  value: RoundTripFormState | PointToPointFormState;
  onChange: (next: RoundTripFormState | PointToPointFormState) => void;
  onSubmit: () => void;
  loading?: boolean;
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.85rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid rgba(0,0,0,0.1)',
  fontSize: '0.95rem',
};

function updateField<T extends RoundTripFormState | PointToPointFormState>(
  value: T,
  field: keyof T,
  next: string,
): T {
  return { ...value, [field]: next };
}

export default function Controls({ mode, value, onChange, onSubmit, loading }: Props) {
  const onInput = (field: InputField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(updateField(value as any, field as any, event.target.value));
    };

  const onNumberInput = (field: keyof BaseFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      onChange({
        ...(value as any),
        [field]: Number.isNaN(parsed) ? 0 : parsed,
      });
    };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div style={rowStyle}>
        <label style={labelStyle}>Startadresse</label>
        <input
          style={inputStyle}
          placeholder="Adresse eller lat,lon"
          value={value.startAddress}
          onChange={onInput('startAddress')}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Start lat"
            value={value.startLat}
            onChange={onInput('startLat')}
          />
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Start lng"
            value={value.startLng}
            onChange={onInput('startLng')}
          />
        </div>
      </div>

      {mode === 'point2point' && (
        <div style={rowStyle}>
          <label style={labelStyle}>Sluttadresse</label>
          <input
            style={inputStyle}
            placeholder="Adresse eller lat,lon"
            value={(value as PointToPointFormState).endAddress}
            onChange={onInput('endAddress')}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Slutt lat"
              value={(value as PointToPointFormState).endLat}
              onChange={onInput('endLat')}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Slutt lng"
              value={(value as PointToPointFormState).endLng}
              onChange={onInput('endLng')}
            />
          </div>
        </div>
      )}

      <div style={rowStyle}>
        <label style={labelStyle}>Måldistanse (km)</label>
        <input
          type="number"
          min={1}
          max={100}
          step={0.5}
          style={inputStyle}
          value={value.targetDistanceKm}
          onChange={onNumberInput('targetDistanceKm')}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Toleranse (meter)</label>
        <input
          type="number"
          min={50}
          max={1000}
          step={25}
          style={inputStyle}
          value={value.toleranceMeters}
          onChange={onNumberInput('toleranceMeters')}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Stigningspreferanse</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['min', 'balanced', 'max'] as const).map((option) => (
            <label key={option} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                type="radio"
                name="elev"
                value={option}
                checked={value.preferElevation === option}
                onChange={() => onChange({ ...(value as any), preferElevation: option })}
              />
              <span style={{ textTransform: 'capitalize' }}>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          border: 'none',
          borderRadius: '0.75rem',
          background: '#111827',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading ? 'progress' : 'pointer',
        }}
        disabled={loading}
      >
        {loading ? 'Planlegger…' : 'Planlegg ruter'}
      </button>
    </form>
  );
}
