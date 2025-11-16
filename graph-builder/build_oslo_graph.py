"""Build a densified pedestrian graph for Oslo and export parquet files."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import LineString, Point

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(exist_ok=True)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = phi2 - phi1
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
    return float(2 * r * np.arctan2(np.sqrt(a), np.sqrt(1 - a)))


def densify_linestring(ls: LineString, max_distance: float) -> Iterable[Point]:
    if ls.length <= max_distance:
        return [ls.interpolate(0, normalized=True), ls.interpolate(1, normalized=True)]
    distances = np.arange(0, ls.length, max_distance)
    coords = [ls.interpolate(d) for d in distances]
    coords.append(ls.interpolate(ls.length))
    return coords


def project_points(points: Iterable[Point], from_crs: str, to_crs: str) -> List[Tuple[float, float]]:
    geom = LineString(points)
    projected, _ = ox.projection.project_geometry(geom, crs=from_crs, to_crs=to_crs)
    return [(float(lat), float(lon)) for lon, lat in projected.coords]


def build_graph(max_distance: float = 25.0, skip_download: bool = False) -> None:
    graphml_path = DATA_DIR / "oslo_walk.graphml"
    if skip_download and graphml_path.exists():
        G = ox.load_graphml(graphml_path)
    else:
        G = ox.graph_from_place(
            "Oslo, Norway",
            network_type="walk",
            simplify=True,
            retain_all=False,
            truncate_by_edge=True,
        )
        ox.save_graphml(G, graphml_path)

    nodes_gdf, edges_gdf = ox.graph_to_gdfs(G)
    G_proj = ox.project_graph(G)
    _, edges_proj = ox.graph_to_gdfs(G_proj)

    node_records: Dict[int, Dict[str, object]] = {}
    id_lookup: Dict[int, int] = {}
    next_node_id = 0

    for osm_id, row in nodes_gdf.iterrows():
        node_records[next_node_id] = {
            "id": next_node_id,
            "osm_id": int(osm_id),
            "lat": float(row["y"]),
            "lon": float(row["x"]),
            "elevation_m": 0.0,
        }
        id_lookup[osm_id] = next_node_id
        next_node_id += 1

    edge_records: List[Dict[str, object]] = []
    next_edge_id = 0

    for (_, _, key), edge_row in edges_gdf.iterrows():
        proj_edge = edges_proj.loc[(edge_row.name[0], edge_row.name[1], edge_row.name[2])]
        geom: LineString = proj_edge.geometry
        points = densify_linestring(geom, max_distance=max_distance)
        wgs_coords = project_points(points, from_crs=G_proj.graph["crs"], to_crs="EPSG:4326")
        prev_node_id = id_lookup[int(edge_row["u"])]
        for lat, lon in wgs_coords[1:-1]:
            node_records[next_node_id] = {
                "id": next_node_id,
                "osm_id": None,
                "lat": lat,
                "lon": lon,
                "elevation_m": 0.0,
            }
            edge_records.append(
                {
                    "id": next_edge_id,
                    "u": prev_node_id,
                    "v": next_node_id,
                    "length_m": haversine_m(
                        node_records[prev_node_id]["lat"],
                        node_records[prev_node_id]["lon"],
                        lat,
                        lon,
                    ),
                    "gain_m": 0.0,
                    "loss_m": 0.0,
                    "highway": edge_row.get("highway"),
                    "surface": edge_row.get("surface"),
                    "flags": json.dumps({}),
                }
            )
            prev_node_id = next_node_id
            next_node_id += 1
            next_edge_id += 1

        final_node_id = id_lookup[int(edge_row["v"])]
        edge_records.append(
            {
                "id": next_edge_id,
                "u": prev_node_id,
                "v": final_node_id,
                "length_m": haversine_m(
                    node_records[prev_node_id]["lat"],
                    node_records[prev_node_id]["lon"],
                    node_records[final_node_id]["lat"],
                    node_records[final_node_id]["lon"],
                ),
                "gain_m": 0.0,
                "loss_m": 0.0,
                "highway": edge_row.get("highway"),
                "surface": edge_row.get("surface"),
                "flags": json.dumps({}),
            }
        )
        next_edge_id += 1

    nodes_df = pd.DataFrame(node_records.values())
    edges_df = pd.DataFrame(edge_records)

    nodes_df.to_parquet(DATA_DIR / "nodes.parquet", index=False)
    edges_df.to_parquet(DATA_DIR / "edges.parquet", index=False)

    nodes_df.to_json(DATA_DIR / "nodes.json", orient="records")
    edges_df.to_json(DATA_DIR / "edges.json", orient="records")

    print(f"Wrote {len(nodes_df)} nodes and {len(edges_df)} edges to {DATA_DIR}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Oslo pedestrian graph")
    parser.add_argument("--max-distance", type=float, default=25.0)
    parser.add_argument("--skip-download", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_graph(max_distance=args.max_distance, skip_download=args.skip_download)
