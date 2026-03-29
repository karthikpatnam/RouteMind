"""
LangGraph Multi-Agent Route Optimization Workflow

A state-graph that orchestrates parallel risk assessment agents and selects
the optimal route between two coordinates.

Pipeline:
  Route Generator → [Weather, News, Traffic] (parallel) → Risk Aggregator
  → Decision Engine → Explanation → Monitor (→ optional loop-back)
"""

import asyncio
import logging
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END

from agents.route_generator import fetch_candidate_routes
from agents.weather import fetch_marine_weather
from agents.traffic import analyze_maritime_traffic
from agents.llm_agents import analyze_news_risk, generate_explanation, evaluate_reroute

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 2  # Maximum rerouting iterations


# ─── State Schema ─────────────────────────────────────────────────────────────

class RouteState(TypedDict):
    source: list[float]              # [lon, lat]
    destination: list[float]         # [lon, lat]
    candidate_routes: list[dict]     # Routes from Mapbox
    weather_risks: list[dict]        # Per-route weather assessments
    news_risks: list[dict]           # Per-route geopolitical assessments
    traffic_risks: list[dict]        # Per-route traffic assessments
    aggregated_scores: list[dict]    # Combined scores for each route
    best_route: dict                 # Selected optimal route
    explanation: str                 # Human-readable reasoning
    original_route: dict             # First candidate (baseline)
    iteration: int                   # Current iteration count
    needs_reroute: bool              # Whether monitor flagged rerouting
    monitor_reason: str              # Monitor's reasoning


# ─── Node Functions ───────────────────────────────────────────────────────────

async def generate_routes(state: RouteState) -> dict:
    """Node 1: Fetch candidate routes from Mapbox Directions API."""
    logger.info(f"[Route Generator] Fetching routes: {state['source']} → {state['destination']}")

    candidates = await fetch_candidate_routes(
        source=state["source"],
        destination=state["destination"],
        alternatives=True,
        max_routes=3,
    )

    # On first iteration, store the first candidate as the "original" route
    original = state.get("original_route") or (candidates[0] if candidates else {})

    return {
        "candidate_routes": candidates,
        "original_route": original,
        "iteration": state.get("iteration", 0) + 1,
        "needs_reroute": False,
    }


async def weather_agent(state: RouteState) -> dict:
    """Node 2a: Assess weather risk for each candidate route's midpoint."""
    logger.info(f"[Weather Agent] Analyzing {len(state['candidate_routes'])} routes")

    risks = []
    for route in state["candidate_routes"]:
        mid = route.get("midpoint", {})
        lat = mid.get("lat", 0)
        lng = mid.get("lon", 0)

        weather_data = await fetch_marine_weather(lat, lng)
        risk_factor = weather_data.get("risk_factor", 0.0)

        risks.append({
            "route_id": route["route_id"],
            "risk_score": risk_factor,
            "severity": weather_data.get("severity", "calm"),
            "summary": weather_data.get("summary", ""),
            "wind_speed": weather_data.get("wind_speed", 0),
            "wave_height": weather_data.get("wave_height", 0),
            "precipitation": weather_data.get("precipitation", 0),
        })

    return {"weather_risks": risks}


async def news_agent(state: RouteState) -> dict:
    """Node 2b: Assess geopolitical/news risk for each route region."""
    logger.info(f"[News Agent] Analyzing {len(state['candidate_routes'])} routes")

    risks = []
    for route in state["candidate_routes"]:
        mid = route.get("midpoint", {})
        src = route.get("source", {})
        dst = route.get("destination", {})

        # Build region description from coordinates
        region_desc = (
            f"Route from ({src.get('lat', 0):.2f}, {src.get('lon', 0):.2f}) "
            f"to ({dst.get('lat', 0):.2f}, {dst.get('lon', 0):.2f}), "
            f"passing through ({mid.get('lat', 0):.2f}, {mid.get('lon', 0):.2f})"
        )

        news_data = await analyze_news_risk(region_desc, mid)

        risks.append({
            "route_id": route["route_id"],
            "risk_score": news_data.get("risk_score", 0.0),
            "summary": news_data.get("summary", ""),
            "events": news_data.get("events", []),
            "disruption_detected": news_data.get("disruption_detected", False),
        })

    return {"news_risks": risks}


async def traffic_agent(state: RouteState) -> dict:
    """Node 2c: Assess traffic conditions for each route."""
    logger.info(f"[Traffic Agent] Analyzing {len(state['candidate_routes'])} routes")

    risks = []
    for route in state["candidate_routes"]:
        mid = route.get("midpoint", {})
        src = route.get("source", {})

        # Use the existing traffic analysis function
        traffic_data = await analyze_maritime_traffic(
            route_origin=f"({src.get('lat', 0):.2f}, {src.get('lon', 0):.2f})",
            predicted_lat=mid.get("lat", 0),
            predicted_lng=mid.get("lon", 0),
        )

        # Normalize congestion score to 0-1
        congestion = traffic_data.get("congestionScore", 0) / 100.0

        risks.append({
            "route_id": route["route_id"],
            "risk_score": round(congestion, 3),
            "summary": traffic_data.get("summary", ""),
            "congestion_score": traffic_data.get("congestionScore", 0),
            "delay_hours": traffic_data.get("delayEstimateHours", 0),
        })

    return {"traffic_risks": risks}


async def aggregate_risks(state: RouteState) -> dict:
    """Node 3: Combine all risk scores into a weighted composite per route."""
    logger.info("[Risk Aggregator] Combining risk factors")

    # Weight distribution
    W_DISTANCE = 0.20   # Shorter is better
    W_DURATION = 0.15   # Faster is better
    W_WEATHER  = 0.25   # Weather risk
    W_TRAFFIC  = 0.20   # Traffic congestion
    W_NEWS     = 0.10   # Geopolitical risk
    W_COST     = 0.10   # Cost efficiency

    routes = state["candidate_routes"]
    weather_map = {r["route_id"]: r for r in state.get("weather_risks", [])}
    news_map = {r["route_id"]: r for r in state.get("news_risks", [])}
    traffic_map = {r["route_id"]: r for r in state.get("traffic_risks", [])}

    # Normalize distance and duration across candidates
    max_dist = max((r["distance_km"] for r in routes), default=1)
    max_dur = max((r["duration_hours"] for r in routes), default=1)
    max_cost = max((r["cost_estimate"] for r in routes), default=1)

    scores = []
    for route in routes:
        rid = route["route_id"]

        # Normalize scores (0-1, lower = better for distance/duration/cost)
        dist_score = route["distance_km"] / max_dist if max_dist > 0 else 0
        dur_score = route["duration_hours"] / max_dur if max_dur > 0 else 0
        cost_score = route["cost_estimate"] / max_cost if max_cost > 0 else 0

        wx_risk = weather_map.get(rid, {}).get("risk_score", 0.0)
        news_risk = news_map.get(rid, {}).get("risk_score", 0.0)
        traffic_risk = traffic_map.get(rid, {}).get("risk_score", 0.0)

        # Weighted total risk (0-1, lower = better)
        total_risk = (
            W_DISTANCE * dist_score
            + W_DURATION * dur_score
            + W_WEATHER * wx_risk
            + W_TRAFFIC * traffic_risk
            + W_NEWS * news_risk
            + W_COST * cost_score
        )

        scores.append({
            "route_id": rid,
            "distance_score": round(dist_score, 3),
            "duration_score": round(dur_score, 3),
            "weather_risk": round(wx_risk, 3),
            "traffic_risk": round(traffic_risk, 3),
            "news_risk": round(news_risk, 3),
            "cost_score": round(cost_score, 3),
            "total_risk": round(total_risk, 3),
            # Include raw data for the response
            "distance_km": route["distance_km"],
            "duration_hours": route["duration_hours"],
            "cost_estimate": route["cost_estimate"],
        })

    return {"aggregated_scores": scores}


async def decision_engine(state: RouteState) -> dict:
    """Node 4: Select the optimal route based on lowest aggregated risk."""
    logger.info("[Decision Engine] Selecting optimal route")

    scores = state["aggregated_scores"]
    if not scores:
        return {"best_route": state["candidate_routes"][0] if state["candidate_routes"] else {}}

    # Select route with lowest total risk
    best_score = min(scores, key=lambda s: s["total_risk"])
    best_route_id = best_score["route_id"]

    # Find the full route data
    best_route = next(
        (r for r in state["candidate_routes"] if r["route_id"] == best_route_id),
        state["candidate_routes"][0],
    )

    # Attach risk scores to the route
    best_route["risk_scores"] = {
        "weather_risk": best_score["weather_risk"],
        "traffic_risk": best_score["traffic_risk"],
        "news_risk": best_score["news_risk"],
        "total_risk": best_score["total_risk"],
    }

    return {"best_route": best_route}


async def explain(state: RouteState) -> dict:
    """Node 5: Generate human-readable explanation."""
    logger.info("[Explanation Node] Generating reasoning")

    explanation = await generate_explanation(
        best_route=state["best_route"],
        all_routes=state["candidate_routes"],
        aggregated_scores=state["aggregated_scores"],
    )

    return {"explanation": explanation}


async def monitor(state: RouteState) -> dict:
    """Node 6: Evaluate if rerouting is necessary."""
    logger.info(f"[Monitor] Iteration {state.get('iteration', 1)} — evaluating route safety")

    # Don't reroute on second iteration (prevent infinite loops)
    if state.get("iteration", 1) >= MAX_ITERATIONS:
        return {"needs_reroute": False, "monitor_reason": "Maximum iterations reached. Using best available route."}

    risks = state["best_route"].get("risk_scores", {})
    result = await evaluate_reroute(state["best_route"], risks)

    return {
        "needs_reroute": result["needs_reroute"],
        "monitor_reason": result["reason"],
    }


# ─── Routing Logic ────────────────────────────────────────────────────────────

def should_reroute(state: RouteState) -> str:
    """Conditional edge: after monitor, decide whether to loop back or finish."""
    if state.get("needs_reroute", False):
        logger.info("[Monitor] → Rerouting triggered. Looping back to route generation.")
        return "reroute"
    logger.info("[Monitor] → Route accepted. Workflow complete.")
    return "done"


# ─── Parallel Fan-Out Helper ─────────────────────────────────────────────────

async def parallel_agents(state: RouteState) -> dict:
    """
    Fan-out: Run Weather, News, and Traffic agents in parallel.
    Returns combined state updates from all three.
    """
    logger.info("[Parallel Farm] Dispatching Weather, News, Traffic agents concurrently")

    weather_task = weather_agent(state)
    news_task = news_agent(state)
    traffic_task = traffic_agent(state)

    weather_result, news_result, traffic_result = await asyncio.gather(
        weather_task, news_task, traffic_task
    )

    # Merge all results
    return {
        **weather_result,
        **news_result,
        **traffic_result,
    }


async def parallel_post_decision(state: RouteState) -> dict:
    """
    Fan-out: Run Explanation and Monitor LLM agents in parallel.
    Returns combined state updates from both.
    """
    logger.info("[Parallel Farm] Dispatching Explain and Monitor agents concurrently")

    explain_task = explain(state)
    monitor_task = monitor(state)

    explain_result, monitor_result = await asyncio.gather(
        explain_task, monitor_task
    )

    # Merge all results
    return {
        **explain_result,
        **monitor_result,
    }


# ─── Build the Graph ──────────────────────────────────────────────────────────

def build_optimization_graph() -> StateGraph:
    """Build and compile the LangGraph state machine for route optimization."""

    graph = StateGraph(RouteState)

    # Add nodes
    graph.add_node("generate_routes", generate_routes)
    graph.add_node("parallel_agents", parallel_agents)
    graph.add_node("aggregate_risks", aggregate_risks)
    graph.add_node("decision_engine", decision_engine)
    graph.add_node("parallel_post_decision", parallel_post_decision)

    # Set entry point
    graph.set_entry_point("generate_routes")

    # Linear edges
    graph.add_edge("generate_routes", "parallel_agents")
    graph.add_edge("parallel_agents", "aggregate_risks")
    graph.add_edge("aggregate_risks", "decision_engine")
    graph.add_edge("decision_engine", "parallel_post_decision")

    # Conditional edge from monitor
    graph.add_conditional_edges(
        "parallel_post_decision",
        should_reroute,
        {
            "reroute": "generate_routes",
            "done": END,
        },
    )

    return graph.compile()


# ─── Entrypoint ───────────────────────────────────────────────────────────────

# Pre-compile the graph (singleton)
optimization_workflow = build_optimization_graph()


async def run_optimization(source: list[float], destination: list[float]) -> dict:
    """
    Execute the full route optimization workflow.

    Args:
        source: [longitude, latitude]
        destination: [longitude, latitude]

    Returns:
        Final state containing best_route, explanation, all_routes, scores
    """
    initial_state: RouteState = {
        "source": source,
        "destination": destination,
        "candidate_routes": [],
        "weather_risks": [],
        "news_risks": [],
        "traffic_risks": [],
        "aggregated_scores": [],
        "best_route": {},
        "explanation": "",
        "original_route": {},
        "iteration": 0,
        "needs_reroute": False,
        "monitor_reason": "",
    }

    logger.info(f"[Workflow] Starting optimization: {source} → {destination}")

    # Run the graph
    final_state = await optimization_workflow.ainvoke(initial_state)

    logger.info("[Workflow] Optimization complete")
    return final_state
