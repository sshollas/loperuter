"use client";

import { useMemo } from "react";

export type Mode = "roundtrip" | "point2point";

export interface ControlsValues {
  startAddress: string;
  endAddress: string;
  targetDistanceKm: number;
  toleranceMeters: number;
  preferElevation: "min" | "balanced" | "max";
}

interface ControlsProps {
  mode: Mode;
  values: ControlsValues;
  loading?: boolean;
  onModeChange(mode: Mode): void;
  onChange(update: Partial<ControlsValues>): void;
  onSubmit(): void;
  onSwapPoints?(): void;
}

export function Controls({
  mode,
  values,
  loading,
  onModeChange,
  onChange,
  onSubmit,
  onSwapPoints,
}: ControlsProps) {
  const distanceLabel = useMemo(
    () => `${values.targetDistanceKm.toFixed(1)} km`,
    [values.targetDistanceKm],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange("roundtrip")}
          className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition ${
            mode === "roundtrip" ? "border-blue-500 bg-blue-100 text-blue-900" : "border-zinc-300"
          }`}
        >
          Rundtur
        </button>
        <button
          type="button"
          onClick={() => onModeChange("point2point")}
          className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition ${
            mode === "point2point" ? "border-blue-500 bg-blue-100 text-blue-900" : "border-zinc-300"
          }`}
        >
          A → B
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="block text-xs font-semibold uppercase text-zinc-500">
            Startadresse
          </span>
          <input
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="F.eks. Karl Johans gate 1, Oslo"
            value={values.startAddress}
            onChange={(event) => onChange({ startAddress: event.target.value })}
          />
        </label>
        {mode === "point2point" && (
          <label className="block">
            <span className="block text-xs font-semibold uppercase text-zinc-500">
              Sluttadresse
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="F.eks. Dronning Eufemias gate 16, Oslo"
              value={values.endAddress}
              onChange={(event) => onChange({ endAddress: event.target.value })}
            />
          </label>
        )}
        {mode === "point2point" && onSwapPoints && (
          <button
            type="button"
            onClick={onSwapPoints}
            className="text-xs font-medium text-blue-600 underline"
          >
            Bytt start/slutt
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-zinc-500">
          Måldistanse
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={2}
            max={50}
            step={0.5}
            value={values.targetDistanceKm}
            onChange={(event) =>
              onChange({ targetDistanceKm: Number.parseFloat(event.target.value) })
            }
            className="flex-1"
          />
          <span className="w-16 text-right text-sm font-semibold">{distanceLabel}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-zinc-500">
          Distanse-toleranse ({values.toleranceMeters.toFixed(0)} m)
        </label>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={values.toleranceMeters}
          onChange={(event) =>
            onChange({ toleranceMeters: Number.parseFloat(event.target.value) })
          }
          className="mt-2 w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-zinc-500">
          Stigning
        </label>
        <div className="mt-2 flex gap-2">
          {[
            { value: "min", label: "Minimer" },
            { value: "balanced", label: "Balansert" },
            { value: "max", label: "Maksimer" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ preferElevation: option.value as ControlsValues["preferElevation"] })}
              className={`flex-1 rounded border px-2 py-2 text-xs font-semibold transition ${
                values.preferElevation === option.value
                  ? "border-blue-500 bg-blue-100 text-blue-900"
                  : "border-zinc-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? "Genererer…" : "Generér ruter"}
      </button>
    </div>
  );
}
