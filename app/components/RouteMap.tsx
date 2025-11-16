'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import polyline from '@mapbox/polyline';
import Map, { Layer, MapRef, Marker, Source, ViewState } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

import type { RouteResponse } from '../lib/graph/types';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const colors = ['#f97316', '#22d3ee', '#a855f7', '#f43f5e', '#10b981'];

function decodePolyline(encoded: string) {
  return polyline.decode(encoded, 6).map(([lat, lon]) => [lon, lat]);
}

interface RouteMapProps {
  result: RouteResponse | null;
}

export default function RouteMap({ result }: RouteMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    latitude: result?.center.lat ?? 59.91,
    longitude: result?.center.lon ?? 10.75,
    zoom: 11,
  });

  useEffect(() => {
    if (!result?.center) return;
    setViewState((prev) => ({ ...prev, latitude: result.center.lat, longitude: result.center.lon }));
  }, [result?.center]);

  useEffect(() => {
    if (!result?.bounds || !mapRef.current) return;
    const [[minLat, minLon], [maxLat, maxLon]] = result.bounds;
    mapRef.current.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 40, duration: 800 }
    );
  }, [result?.bounds]);

  const features = useMemo(() => {
    if (!result?.alternatives?.length) return [];
    return result.alternatives.map((alt, idx) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: decodePolyline(alt.polyline) },
      properties: {
        color: colors[idx % colors.length],
      },
    }));
  }, [result]);

  const primaryCoordinates = features[0]?.geometry.coordinates;
  const start = primaryCoordinates?.[0];
  const end = primaryCoordinates?.[primaryCoordinates.length - 1];

  return (
    <div className="map-shell">
      <Map
        ref={(instance) => {
          mapRef.current = instance;
        }}
        mapLib={maplibregl}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        viewState={viewState}
        onMove={(evt) => setViewState(evt.viewState)}
      >
        {features.map((feature, idx) => (
          <Source key={`route-${idx}`} type="geojson" data={{ type: 'FeatureCollection', features: [feature] }}>
            <Layer
              id={`layer-${idx}`}
              type="line"
              paint={{
                'line-color': feature.properties.color,
                'line-width': 5,
                'line-opacity': 0.85,
              }}
            />
          </Source>
        ))}
        {start && (
          <Marker longitude={start[0]} latitude={start[1]} color="#22d3ee">
            <span className="marker-label">Start</span>
          </Marker>
        )}
        {end && (
          <Marker longitude={end[0]} latitude={end[1]} color="#f43f5e">
            <span className="marker-label">Mål</span>
          </Marker>
        )}
      </Map>
    </div>
  );
}
