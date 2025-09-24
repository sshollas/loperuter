'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RouteAlternative, RouteResponse } from '@/types/route';
import { decodePolyline } from '@/lib/geo/polyline';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];

type Props = {
  alternatives: RouteAlternative[];
  center?: RouteResponse['center'];
  bounds?: RouteResponse['bounds'];
  onRouteClick?: (index: number) => void;
  selectedIndex: number;
};

export default function MapView({ alternatives, center, bounds, onRouteClick, selectedIndex }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const clickHandlerRef = useRef<boolean>(false);

  const featureCollection = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: alternatives.map((alt, index) => ({
        type: 'Feature' as const,
        properties: {
          index,
          distance: alt.distanceMeters,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: decodePolyline(alt.polyline).map((p) => [p.lng, p.lat]),
        },
      })),
    };
  }, [alternatives]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: center ? [center.lng, center.lat] : [10.75, 59.91],
      zoom: center ? 12 : 5,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, [center]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    if (!mapInstance.getSource('routes')) {
      mapInstance.addSource('routes', {
        type: 'geojson',
        data: featureCollection,
      });
      mapInstance.addLayer({
        id: 'routes-layer',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'index'], selectedIndex],
            COLORS[selectedIndex % COLORS.length],
            '#9ca3af',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'index'], selectedIndex],
            6,
            4,
          ],
          'line-opacity': [
            'case',
            ['==', ['get', 'index'], selectedIndex],
            0.95,
            0.65,
          ],
        },
      });
    } else {
      const source = mapInstance.getSource('routes') as maplibregl.GeoJSONSource;
      source.setData(featureCollection as any);
    }

    mapInstance.setPaintProperty('routes-layer', 'line-color', [
      'case',
      ['==', ['get', 'index'], selectedIndex],
      COLORS[selectedIndex % COLORS.length],
      '#9ca3af',
    ]);
    mapInstance.setPaintProperty('routes-layer', 'line-width', [
      'case',
      ['==', ['get', 'index'], selectedIndex],
      6,
      4,
    ]);
    mapInstance.setPaintProperty('routes-layer', 'line-opacity', [
      'case',
      ['==', ['get', 'index'], selectedIndex],
      0.95,
      0.65,
    ]);

    if (!clickHandlerRef.current) {
      clickHandlerRef.current = true;
      mapInstance.on('click', 'routes-layer', (event) => {
        const feature = event.features?.[0];
        if (feature && typeof feature.properties?.index === 'number') {
          onRouteClick?.(feature.properties.index);
        }
      });
      mapInstance.on('mouseenter', 'routes-layer', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', 'routes-layer', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }
  }, [featureCollection, onRouteClick, selectedIndex]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;
    if (bounds) {
      mapInstance.fitBounds(bounds as any, { padding: 48, duration: 600 });
    } else if (center) {
      mapInstance.flyTo({ center: [center.lng, center.lat], zoom: 12 });
    }
  }, [bounds, center, featureCollection.features.length]);

  return <div ref={containerRef} id="map" style={{ width: '100%', height: '100%' }} />;
}
