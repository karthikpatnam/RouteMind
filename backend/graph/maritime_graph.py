import networkx as nx
from typing import Optional

# ── Maritime port graph ───────────────────────────────────────────────
# Nodes = major world ports  |  Edges = shipping lane with weights
# Weight = distance_km * risk_factor  (lower = better)

PORTS = {
    "Shanghai":       (31.23, 121.47),
    "Singapore":      (1.35,  103.82),
    "Rotterdam":      (51.92,  4.48),
    "Los Angeles":    (33.73,-118.26),
    "Hamburg":        (53.55,  9.99),
    "Busan":          (35.08, 128.97),
    "Dubai":          (25.20,  55.27),
    "Hong Kong":      (22.31, 114.17),
    "Antwerp":        (51.26,  4.38),
    "Mumbai":         (18.95,  72.85),
    "New York":       (40.65, -74.05),
    "Tokyo":          (35.62, 139.77),
    "Suez":           (30.70,  32.35),
    "Southampton":    (50.89,  -1.39),
    "Cape Town":      (-33.91, 18.42),
    "Sydney":         (-33.87,151.21),
    "Oslo":           (59.91,  10.75),
    "Barcelona":      (41.38,   2.17),
    "Alexandria":     (31.20,  29.92),
    "Colombo":        (6.93,   79.84),
    "Mombasa":        (-4.05,  39.67),
    "Lagos":          (6.45,    3.40),
    "Buenos Aires":   (-34.59, -58.37),
    "Valparaiso":     (-33.04, -71.64),
    "Vancouver":      (49.29, -123.11),
    "Piraeus":        (37.94,  23.63),
    "Genoa":          (44.41,   8.93),
}

# (origin, destination, base_distance_km, base_risk 1.0=normal higher=riskier)
LANES = [
    ("Shanghai",    "Busan",        905,  1.0),
    ("Shanghai",    "Hong Kong",    1225, 1.0),
    ("Shanghai",    "Singapore",    3300, 1.3),  # South China Sea risk
    ("Shanghai",    "Tokyo",        1800, 1.0),
    ("Shanghai",    "Los Angeles",  10450,1.0),
    ("Shanghai",    "Sydney",       8200, 1.0),
    ("Singapore",   "Dubai",        6000, 1.4),  # Strait of Malacca + Indian Ocean
    ("Singapore",   "Colombo",      2000, 1.2),
    ("Singapore",   "Mumbai",       2800, 1.2),
    ("Singapore",   "Rotterdam",   15500, 1.5),  # Red Sea risk
    ("Singapore",   "Sydney",       6300, 1.0),
    ("Dubai",       "Suez",         4000, 1.8),  # Red Sea / Houthi risk
    ("Dubai",       "Mumbai",       1900, 1.1),
    ("Suez",        "Rotterdam",    5400, 1.0),
    ("Suez",        "Piraeus",      1700, 1.0),
    ("Suez",        "Alexandria",    300, 1.0),
    ("Rotterdam",   "Hamburg",       380, 1.0),
    ("Rotterdam",   "Antwerp",       110, 1.0),
    ("Rotterdam",   "Southampton",   800, 1.0),
    ("Rotterdam",   "Oslo",         1100, 1.0),
    ("Rotterdam",   "New York",     5800, 1.0),
    ("Rotterdam",   "Barcelona",    1850, 1.0),
    ("Southampton", "New York",     5600, 1.0),
    ("New York",    "Los Angeles",  7800, 1.0),  # via Panama
    ("New York",    "Buenos Aires", 9800, 1.0),
    ("New York",    "Vancouver",    9200, 1.0),
    ("Los Angeles", "Tokyo",        8750, 1.0),
    ("Los Angeles", "Sydney",      12100, 1.0),
    ("Los Angeles", "Vancouver",    1750, 1.0),
    ("Los Angeles", "Valparaiso",   8900, 1.0),
    ("Cape Town",   "Singapore",    9700, 1.0),  # Cape of Good Hope route
    ("Cape Town",   "Rotterdam",   12000, 1.0),
    ("Cape Town",   "Buenos Aires", 7000, 1.0),
    ("Cape Town",   "Mombasa",      4200, 1.1),
    ("Mombasa",     "Mumbai",       3000, 1.1),
    ("Lagos",       "Rotterdam",    6500, 1.2),
    ("Lagos",       "New York",     9000, 1.1),
    ("Piraeus",     "Genoa",        1100, 1.0),
    ("Piraeus",     "Alexandria",   1100, 1.0),
    ("Barcelona",   "Genoa",         720, 1.0),
    ("Colombo",     "Mumbai",       1200, 1.1),
    ("Hamburg",     "Oslo",          900, 1.0),
    ("Hong Kong",   "Busan",        1570, 1.0),
    ("Hong Kong",   "Tokyo",        2900, 1.0),
    ("Busan",       "Tokyo",         950, 1.0),
    ("Sydney",      "Tokyo",        7800, 1.0),
    ("Sydney",      "Los Angeles",  12100,1.0),
]


def build_graph(extra_risk: dict[str, float] | None = None) -> nx.Graph:
    """
    Build the maritime routing graph.
    extra_risk: optional {lane_id: multiplier} to inject live risk data from agents.
    e.g. {"Dubai->Suez": 2.5} raises Red Sea risk dynamically.
    """
    G = nx.Graph()
    for name, (lat, lng) in PORTS.items():
        G.add_node(name, lat=lat, lng=lng)

    for origin, dest, km, risk in LANES:
        lane_id = f"{origin}->{dest}"
        r = risk * (extra_risk.get(lane_id, 1.0) if extra_risk else 1.0)
        G.add_edge(origin, dest, weight=km * r, distance=km, risk=r, lane_id=lane_id)

    return G


def find_route(origin: str, destination: str,
               extra_risk: dict[str, float] | None = None,
               via: Optional[str] = None) -> dict:
    """
    Dijkstra shortest path between two ports.
    Returns path nodes, total distance, total risk-adjusted weight, and per-leg details.
    """
    G = build_graph(extra_risk)

    if origin not in G:
        return {"error": f"Unknown port: {origin}"}
    if destination not in G:
        return {"error": f"Unknown port: {destination}"}

    try:
        path: list[str] = nx.dijkstra_path(G, origin, destination, weight="weight")
        total_weight: float = nx.dijkstra_path_length(G, origin, destination, weight="weight")

        legs = []
        total_km = 0.0
        max_risk = 1.0
        for i in range(len(path) - 1):
            e = G[path[i]][path[i+1]]
            total_km += e["distance"]
            max_risk = max(max_risk, e["risk"])
            legs.append({
                "from": path[i],
                "to": path[i+1],
                "distance_km": e["distance"],
                "risk_factor": round(e["risk"], 2),
                "from_lat": G.nodes[path[i]]["lat"],
                "from_lng": G.nodes[path[i]]["lng"],
                "to_lat": G.nodes[path[i+1]]["lat"],
                "to_lng": G.nodes[path[i+1]]["lng"],
            })

        # Estimate transit time: assume 15 knots average (~28 km/h)
        transit_hours = round(total_km / 28)
        transit_days  = round(transit_hours / 24, 1)

        waypoints = [{"lat": G.nodes[n]["lat"], "lng": G.nodes[n]["lng"], "name": n} for n in path]

        return {
            "path": path,
            "waypoints": waypoints,
            "legs": legs,
            "total_distance_km": round(total_km),
            "transit_days": transit_days,
            "max_risk_factor": round(max_risk, 2),
            "risk_adjusted_weight": round(total_weight),
        }

    except nx.NetworkXNoPath:
        return {"error": f"No route found between {origin} and {destination}"}


def list_ports() -> list[dict]:
    """Return all port nodes with coordinates."""
    return [{"name": name, "lat": lat, "lng": lng} for name, (lat, lng) in PORTS.items()]
