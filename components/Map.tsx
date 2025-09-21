"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
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

interface KilometerMarker {
  distanceMeters: number;
  coordinate: LatLng;
  label: string;
}

interface MapProps {
  center?: LatLng;
  bounds?: [[number, number], [number, number]];
  routes: MapRoute[];
  kilometerMarkers?: KilometerMarker[];
  activeMarker?: { coordinate: LatLng; color?: string };
  activeProgress?: { polyline: string; color?: string };
}

function lightenColor(hex: string, amount = 0.5) {
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const blend = (value: number) => Math.round(value + (255 - value) * amount);
  return `#${blend(r).toString(16).padStart(2, "0")}${blend(g)
    .toString(16)
    .padStart(2, "0")}${blend(b).toString(16).padStart(2, "0")}`;
}

export function MapView({
  center,
  bounds,
  routes,
  kilometerMarkers,
  activeMarker,
  activeProgress,
}: MapProps) {
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
    const addArrowImage = () => {
      if (map.hasImage("route-arrow")) {
        return;
      }
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.15);
      ctx.lineTo(size * 0.82, size * 0.85);
      ctx.lineTo(size * 0.18, size * 0.85);
      ctx.closePath();
      ctx.fillStyle = "#000";
      ctx.fill();
      const image = ctx.getImageData(0, 0, size, size);
      map.addImage("route-arrow", image, { sdf: true });
    };
    if (map.isStyleLoaded()) {
      addArrowImage();
    } else {
      map.once("load", addArrowImage);
    }
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
      const features: Feature<
        LineString,
        {
          id: string;
          color: string;
          width: number;
          active: boolean;
          inactiveColor: string;
        }
      >[] = routes.map((route) => ({
          type: "Feature",
          properties: {
            id: route.id,
            color: route.color,
            width: route.width ?? (route.active ? 6 : 4),
            active: route.active ?? false,
            inactiveColor: lightenColor(route.color, 0.75),
          },
          geometry: {
            type: "LineString",
            coordinates: decodePolyline(route.polyline).map((point) => [point.lng, point.lat]),
          },
        }),
      );

      const sourceId = "route-alternatives";
      const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      const collection: FeatureCollection<
        LineString,
        {
          id: string;
          color: string;
          width: number;
          active: boolean;
          inactiveColor: string;
        }
      > = {
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
      }

      if (map.getLayer("routes")) {
        map.removeLayer("routes");
      }

      if (!map.getLayer("routes-base")) {
        map.addLayer({
          id: "routes-base",
          type: "line",
          source: sourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": [
              "case",
              ["get", "active"],
              ["get", "color"],
              ["get", "inactiveColor"],
            ],
            "line-width": ["get", "width"],
            "line-opacity": ["case", ["get", "active"], 0.95, 0.35],
            "line-blur": 0.2,
          },
        });
      }

      if (!map.getLayer("routes-highlight")) {
        map.addLayer({
          id: "routes-highlight",
          type: "line",
          source: sourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          filter: ["==", ["get", "active"], true],
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["+", ["get", "width"], 2],
            "line-opacity": 0.9,
            "line-blur": 0.4,
          },
        });
      }

      if (!map.getLayer("routes-direction")) {
        map.addLayer({
          id: "routes-direction",
          type: "symbol",
          source: sourceId,
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 80,
            "icon-image": "route-arrow",
            "icon-size": 0.6,
            "icon-allow-overlap": false,
          },
          paint: {
            "icon-color": [
              "case",
              ["get", "active"],
              ["get", "color"],
              ["get", "inactiveColor"],
            ],
            "icon-opacity": ["case", ["get", "active"], 0.9, 0.35],
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "route-kilometers";
    const circleLayerId = "route-km-circles";
    const labelLayerId = "route-km-labels";

    const cleanupLayers = () => {
      if (map.getLayer(labelLayerId)) {
        map.removeLayer(labelLayerId);
      }
      if (map.getLayer(circleLayerId)) {
        map.removeLayer(circleLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };

    if (!kilometerMarkers || kilometerMarkers.length === 0) {
      if (map.isStyleLoaded()) {
        cleanupLayers();
      } else {
        const onLoad = () => cleanupLayers();
        map.once("load", onLoad);
        return () => {
          map.off("load", onLoad);
        };
      }
      return;
    }

    const updateMarkers = () => {
      cleanupLayers();

      const features: Feature<
        Point,
        { label: string; distance: number }
      >[] = kilometerMarkers.map((marker) => ({
        type: "Feature",
        properties: {
          label: marker.label,
          distance: marker.distanceMeters,
        },
        geometry: {
          type: "Point",
          coordinates: [marker.coordinate.lng, marker.coordinate.lat],
        },
      }));

      const collection: FeatureCollection<
        Point,
        { label: string; distance: number }
      > = {
        type: "FeatureCollection",
        features,
      };

      map.addSource(sourceId, {
        type: "geojson",
        data: collection,
      });

      map.addLayer({
        id: circleLayerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#2563eb",
        },
      });

      map.addLayer({
        id: labelLayerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });
    };

    if (map.isStyleLoaded()) {
      updateMarkers();
      return () => undefined;
    }

    const onLoad = () => updateMarkers();
    map.once("load", onLoad);
    return () => {
      map.off("load", onLoad);
    };
  }, [kilometerMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "route-progress";
    const layerId = "route-progress";

    const applyProgress = () => {
      const collection: FeatureCollection<
        LineString,
        { color: string }
      > = activeProgress
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  color: activeProgress.color ?? "#2563eb",
                },
                geometry: {
                  type: "LineString",
                  coordinates: decodePolyline(activeProgress.polyline).map((point) => [
                    point.lng,
                    point.lat,
                  ]),
                },
              },
            ],
          }
        : { type: "FeatureCollection", features: [] };

      const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(collection);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: collection,
        });
      }

      if (!map.getLayer(layerId)) {
        const beforeLayer = map.getLayer("routes-direction") ? "routes-direction" : undefined;
        map.addLayer(
          {
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": ["coalesce", ["get", "color"], "#2563eb"],
              "line-width": 8,
              "line-opacity": 0.95,
            },
          },
          beforeLayer,
        );
      }
    };

    if (map.isStyleLoaded()) {
      applyProgress();
      return undefined;
    }

    const onLoad = () => applyProgress();
    map.once("load", onLoad);
    return () => {
      map.off("load", onLoad);
    };
  }, [activeProgress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = "route-progress-point";
    const layerId = "route-progress-point";

    const applyPoint = () => {
      const collection: FeatureCollection<Point, { color: string }> = activeMarker
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  color: activeMarker.color ?? "#2563eb",
                },
                geometry: {
                  type: "Point",
                  coordinates: [activeMarker.coordinate.lng, activeMarker.coordinate.lat],
                },
              },
            ],
          }
        : { type: "FeatureCollection", features: [] };

      const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(collection);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: collection,
        });
      }

      if (!map.getLayer(layerId)) {
        const beforeLayer = map.getLayer("route-progress")
          ? "route-progress"
          : map.getLayer("routes-direction")
            ? "routes-direction"
            : undefined;
        map.addLayer(
          {
            id: layerId,
            type: "circle",
            source: sourceId,
            paint: {
              "circle-radius": 6,
              "circle-color": ["coalesce", ["get", "color"], "#2563eb"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          },
          beforeLayer,
        );
      }
    };

    if (map.isStyleLoaded()) {
      applyPoint();
      return undefined;
    }

    const onLoad = () => applyPoint();
    map.once("load", onLoad);
    return () => {
      map.off("load", onLoad);
    };
  }, [activeMarker]);

  return <div ref={containerRef} className="h-full w-full" />;
}
