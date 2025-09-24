'use client';

interface Point {
  distanceMeters: number;
  elevationMeters: number;
}

type Props = {
  profile: Point[];
};

export default function ElevationChart({ profile }: Props) {
  if (!profile.length) return null;
  const width = 320;
  const height = 160;
  const maxElevation = Math.max(...profile.map((p) => p.elevationMeters));
  const minElevation = Math.min(...profile.map((p) => p.elevationMeters));
  const totalDistance = profile[profile.length - 1]?.distanceMeters ?? 0;

  const points = profile
    .map((p) => {
      const x = totalDistance > 0 ? (p.distanceMeters / totalDistance) * (width - 20) + 10 : 10;
      const y =
        maxElevation === minElevation
          ? height / 2
          : height - ((p.elevationMeters - minElevation) / (maxElevation - minElevation)) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} role="img" aria-label="Elevasjonsprofil">
      <defs>
        <linearGradient id="elevGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
        </linearGradient>
      </defs>
      <polyline
        points={`10,${height - 10} ${points} ${width - 10},${height - 10}`}
        fill="url(#elevGradient)"
        stroke="#2563eb"
        strokeWidth={2}
      />
      <polyline points={points} fill="none" stroke="#1d4ed8" strokeWidth={2.5} />
      <text x={10} y={15} fontSize={12} fill="#374151">
        Høyde: {Math.round(minElevation)}–{Math.round(maxElevation)} m
      </text>
      <text x={width - 10} y={height - 5} fontSize={11} fill="#6b7280" textAnchor="end">
        {Math.round(totalDistance / 1000)} km
      </text>
    </svg>
  );
}
