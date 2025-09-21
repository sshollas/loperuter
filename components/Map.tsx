"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { decodePolyline } from "@/lib/geo/utils";
import type { LatLng } from "@/types/route";

export interface MapRoute {
  id: string;
  polyline: string;
  color: string;
  width?: number;
  active?: boolean;
}

interface MapProps {
  center?: LatLng;
  bounds?: [[number, number], [number, number]];
  routes: MapRoute[];
}

export function MapView({ center, bounds, routes }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: center ? [center.lng, center.lat] : [10.7522, 59.9139],
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl());
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (bounds) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 600 });
    } else if (center) {
      map.setCenter([center.lng, center.lat]);
    }
  }, [bounds, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRoutes = () => {
      const features: Feature<LineString, { id: string; color: string; width: number; active: boolean }>[] = routes.map(
        (route) => ({
          type: "Feature",
          properties: {
            id: route.id,
            color: route.color,
            width: route.width ?? (route.active ? 6 : 4),
            active: route.active ?? false,
          },
          geometry: {
            type: "LineString",
            coordinates: decodePolyline(route.polyline).map((point) => [point.lng, point.lat]),
          },
        }),
      );

      const sourceId = "route-alternatives";
      const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      const collection: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features,
      };
      if (existing) {
        existing.setData(collection);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: collection,
        });
        map.addLayer({
          id: "routes",
          type: "line",
          source: sourceId,
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["get", "width"],
            "line-opacity": ["case", ["get", "active"], 0.95, 0.6],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyRoutes();
      return;
    }

    map.once("load", applyRoutes);
    return () => {
      map.off("load", applyRoutes);
    };
  }, [routes]);

  return <div ref={containerRef} className="h-full w-full" />;
}
