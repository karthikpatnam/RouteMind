"""
Optimize Route Router — POST /optimize-route

Accepts source and destination coordinates, runs the LangGraph multi-agent
workflow, and returns the optimal route with explanation and all candidate data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import logging
import time

from graph.langgraph_workflow import run_optimization

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Route Optimization"])


class OptimizeRouteRequest(BaseModel):
    source: list[float] = Field(
        ...,
        description="Source coordinates [longitude, latitude]",
        min_length=2,
        max_length=2,
        json_schema_extra={"example": [121.4737, 31.2304]},
    )
    destination: list[float] = Field(
        ...,
        description="Destination coordinates [longitude, latitude]",
        min_length=2,
        max_length=2,
        json_schema_extra={"example": [-118.2437, 34.0522]},
    )


class RouteRiskScores(BaseModel):
    weather_risk: float = 0.0
    traffic_risk: float = 0.0
    news_risk: float = 0.0
    total_risk: float = 0.0


@router.post("/optimize-route")
async def optimize_route(req: OptimizeRouteRequest):
    """
    Run the LangGraph multi-agent route optimization workflow.

    1. Fetches candidate routes from Mapbox Directions API
    2. Runs Weather, News, and Traffic agents in parallel
    3. Aggregates risk scores
    4. Selects the optimal route
    5. Generates human-readable explanation
    6. Monitors and optionally reroutes

    Returns the best route, explanation, original route comparison,
    and all candidate routes with detailed scores.
    """
    start_time = time.time()

    try:
        # Validate coordinates
        if not (-180 <= req.source[0] <= 180 and -90 <= req.source[1] <= 90):
            raise HTTPException(status_code=400, detail="Invalid source coordinates")
        if not (-180 <= req.destination[0] <= 180 and -90 <= req.destination[1] <= 90):
            raise HTTPException(status_code=400, detail="Invalid destination coordinates")

        # Run the optimization workflow
        result = await run_optimization(
            source=req.source,
            destination=req.destination,
        )

        elapsed = round(time.time() - start_time, 2)

        # Build response
        best_route = result.get("best_route", {})
        response = {
            "status": "success",
            "processing_time_seconds": elapsed,
            "best_route": {
                "route_id": best_route.get("route_id"),
                "geometry": best_route.get("geometry"),
                "distance_km": best_route.get("distance_km"),
                "duration_hours": best_route.get("duration_hours"),
                "cost_estimate": best_route.get("cost_estimate"),
                "waypoints": best_route.get("waypoints"),
                "risk_scores": best_route.get("risk_scores", {}),
            },
            "explanation": result.get("explanation", ""),
            "original_route": _summarize_route(result.get("original_route", {})),
            "all_routes": [
                {
                    **_summarize_route(route),
                    "scores": next(
                        (s for s in result.get("aggregated_scores", [])
                         if s["route_id"] == route["route_id"]),
                        {},
                    ),
                }
                for route in result.get("candidate_routes", [])
            ],
            "risk_details": {
                "weather_assessments": result.get("weather_risks", []),
                "news_assessments": result.get("news_risks", []),
                "traffic_assessments": result.get("traffic_risks", []),
            },
            "iterations": result.get("iteration", 1),
            "monitor_reason": result.get("monitor_reason", ""),
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route optimization failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Route optimization failed: {str(e)}",
        )


def _summarize_route(route: dict) -> dict:
    """Extract key fields from a route for the response."""
    if not route:
        return {}
    return {
        "route_id": route.get("route_id"),
        "distance_km": route.get("distance_km"),
        "duration_hours": route.get("duration_hours"),
        "cost_estimate": route.get("cost_estimate"),
        "waypoints": route.get("waypoints"),
    }
