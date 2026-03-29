"""
Route Generator — Fetches candidate routes from Mapbox Directions API.
Uses the driving profile with alternatives=true to get 2-3 route variants.
"""

import os
import httpx
import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)

MAPBOX_BASE = "https://api.mapbox.com/directions/v5/mapbox/driving"


def _haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _extract_midpoint(geometry: dict) -> dict:
    """Extract the geographic midpoint of a route geometry."""
    coords = geometry.get("coordinates", [])
    if not coords:
        return {"lon": 0, "lat": 0}
    mid_idx = len(coords) // 2
    return {"lon": coords[mid_idx][0], "lat": coords[mid_idx][1]}


def _estimate_cost(distance_km: float, duration_hours: float) -> float:
    """
    Rough cost estimate based on distance and duration.
    Assumes fuel cost ~ $0.15/km + driver cost ~ $25/hr.
    """
    return round(distance_km * 0.15 + duration_hours * 25, 2)


async def fetch_candidate_routes(
    source: list[float],
    destination: list[float],
    alternatives: bool = True,
    max_routes: int = 3,
) -> list[dict]:
    """
    Fetch candidate routes from Mapbox Directions API.

    Args:
        source: [longitude, latitude]
        destination: [longitude, latitude]
        alternatives: Whether to request alternative routes
        max_routes: Maximum number of routes to return

    Returns:
        List of route dicts with geometry, distance, duration, waypoints, midpoint, cost
    """
    token = os.environ.get("MAPBOX_TOKEN", "")
    if not token:
        logger.warning("MAPBOX_TOKEN not set — returning fallback straight-line route")
        return _fallback_routes(source, destination)

    coords_str = f"{source[0]},{source[1]};{destination[0]},{destination[1]}"
    url = (
        f"{MAPBOX_BASE}/{coords_str}"
        f"?access_token={token}"
        f"&alternatives={'true' if alternatives else 'false'}"
        f"&geometries=geojson"
        f"&overview=full"
        f"&steps=false"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.error(f"Mapbox API returned {resp.status_code}: {resp.text[:200]}")
                return _fallback_routes(source, destination)

            data = resp.json()
            mapbox_routes = data.get("routes", [])
            if not mapbox_routes:
                logger.warning("Mapbox returned no routes")
                return _fallback_routes(source, destination)

            candidates = []
            for i, route in enumerate(mapbox_routes[:max_routes]):
                distance_km = round(route["distance"] / 1000, 2)
                duration_hours = round(route["duration"] / 3600, 2)
                geometry = route.get("geometry", {})
                midpoint = _extract_midpoint(geometry)
                cost = _estimate_cost(distance_km, duration_hours)

                # Extract waypoints (sample every N-th coordinate)
                coords = geometry.get("coordinates", [])
                step = max(1, len(coords) // 10)
                waypoints = [
                    {"lon": c[0], "lat": c[1]}
                    for c in coords[::step]
                ]
                # Ensure start and end are included
                if coords:
                    waypoints[0] = {"lon": coords[0][0], "lat": coords[0][1]}
                    if waypoints[-1] != {"lon": coords[-1][0], "lat": coords[-1][1]}:
                        waypoints.append({"lon": coords[-1][0], "lat": coords[-1][1]})

                candidates.append({
                    "route_id": f"candidate-{i + 1}",
                    "distance_km": distance_km,
                    "duration_hours": duration_hours,
                    "geometry": geometry,
                    "midpoint": midpoint,
                    "waypoints": waypoints,
                    "cost_estimate": cost,
                    "source": {"lon": source[0], "lat": source[1]},
                    "destination": {"lon": destination[0], "lat": destination[1]},
                })

            logger.info(f"Fetched {len(candidates)} candidate routes from Mapbox")
            return candidates

    except Exception as e:
        logger.error(f"Mapbox Directions API error: {e}")
        return _fallback_routes(source, destination)


def _fallback_routes(source: list[float], destination: list[float]) -> list[dict]:
    """Generate a single straight-line fallback route when API is unavailable."""
    dist = _haversine_km(source[0], source[1], destination[0], destination[1])
    duration = round(dist / 80, 2)  # ~80 km/h average
    cost = _estimate_cost(dist, duration)

    return [{
        "route_id": "candidate-1",
        "distance_km": round(dist, 2),
        "duration_hours": duration,
        "geometry": {
            "type": "LineString",
            "coordinates": [source, destination],
        },
        "midpoint": {
            "lon": (source[0] + destination[0]) / 2,
            "lat": (source[1] + destination[1]) / 2,
        },
        "waypoints": [
            {"lon": source[0], "lat": source[1]},
            {"lon": destination[0], "lat": destination[1]},
        ],
        "cost_estimate": cost,
        "source": {"lon": source[0], "lat": source[1]},
        "destination": {"lon": destination[0], "lat": destination[1]},
    }]
