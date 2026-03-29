"""
LLM Agents — Gemini-powered intelligent analysis for the multi-agent routing system.

Uses Google Gemini (via google-genai) for:
  - News/geopolitical risk analysis
  - Route explanation generation
  - Rerouting evaluation
"""

import os
import json
import logging
import httpx
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"


def _get_gemini_client():
    """Get a Gemini client, or None if not configured."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


# ─── News Intelligence Agent ──────────────────────────────────────────────────

async def analyze_news_risk(region_description: str, coords: dict) -> dict:
    """
    Uses Tavily search + Gemini LLM to assess geopolitical/news risk for a route region.

    1. Searches Tavily for recent news about the region
    2. Feeds results to Gemini for structured risk analysis
    3. Returns risk score (0-1), summary, and detected events

    Args:
        region_description: Human-readable description of the route region
        coords: {"lon": float, "lat": float} — midpoint of the route

    Returns:
        dict with risk_score, summary, events, disruption_detected
    """
    tavily_key = os.environ.get("TAVILY_API_KEY")
    news_context = ""

    # Phase 1: Gather news intelligence via Tavily
    if tavily_key:
        try:
            query = f"road safety traffic incidents conflicts disruptions {region_description}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": tavily_key,
                        "query": query,
                        "search_depth": "basic",
                        "max_results": 5,
                    },
                )
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    news_items = []
                    for r in results:
                        title = r.get("title", "")
                        content = r.get("content", "")
                        news_items.append(f"- {title}: {content[:200]}")
                    news_context = "\n".join(news_items) if news_items else "No recent news found."
                else:
                    news_context = "News search unavailable."
        except Exception as e:
            logger.warning(f"Tavily search failed: {e}")
            news_context = "News search encountered an error."
    else:
        news_context = "No news API configured. Using general knowledge only."

    # Phase 2: Gemini LLM analysis
    gemini = _get_gemini_client()
    if not gemini:
        return _fallback_news_risk(region_description)

    prompt = f"""You are a Geopolitical Risk Intelligence AI for a route optimization system.
Analyze the following news and context to assess the safety risk for travel through this region.

REGION: {region_description}
COORDINATES: lat={coords.get('lat', 0):.4f}, lon={coords.get('lon', 0):.4f}

RECENT NEWS:
{news_context}

Evaluate the risk considering:
- Active conflicts or civil unrest
- Road blockages or infrastructure damage
- Natural disasters or severe events
- Criminal activity or safety concerns
- Political instability

Return a JSON object with EXACTLY these fields:
{{
    "risk_score": <float 0.0 to 1.0, where 0=safe, 1=extremely dangerous>,
    "summary": "<1-2 sentence risk assessment>",
    "events": ["<list of specific risk events detected, empty if none>"],
    "disruption_detected": <boolean>
}}"""

    try:
        response = gemini.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        result = json.loads(response.text)
        # Validate and clamp
        result["risk_score"] = max(0.0, min(1.0, float(result.get("risk_score", 0.1))))
        result["disruption_detected"] = bool(result.get("disruption_detected", False))
        return result
    except Exception as e:
        logger.error(f"Gemini news analysis error: {e}")
        return _fallback_news_risk(region_description)


def _fallback_news_risk(region: str) -> dict:
    return {
        "risk_score": 0.1,
        "summary": f"Unable to assess geopolitical risk for {region}. Assuming low risk.",
        "events": [],
        "disruption_detected": False,
    }


# ─── Explanation Generator ────────────────────────────────────────────────────

async def generate_explanation(
    best_route: dict,
    all_routes: list[dict],
    aggregated_scores: list[dict],
) -> str:
    """
    Generates a human-readable explanation for why this route was selected.

    Args:
        best_route: The selected optimal route
        all_routes: All candidate routes
        aggregated_scores: Risk scores for all routes

    Returns:
        Human-readable explanation string
    """
    gemini = _get_gemini_client()
    if not gemini:
        return _fallback_explanation(best_route, aggregated_scores)

    prompt = f"""You are a Route Optimization AI Advisor. Explain to the user why the selected route
is the best option, comparing it against the alternatives.

SELECTED ROUTE:
- ID: {best_route.get('route_id')}
- Distance: {best_route.get('distance_km')} km
- Duration: {best_route.get('duration_hours')} hours
- Cost Estimate: ${best_route.get('cost_estimate')}

ALL ROUTES WITH SCORES:
{json.dumps(aggregated_scores, indent=2)}

Write a clear, concise explanation (2-4 sentences) that:
1. States which route was selected and why
2. Mentions the key risk factors that influenced the decision
3. Compares briefly with the alternatives
4. Provides a confidence assessment

Return ONLY the explanation text as a plain string (not JSON)."""

    try:
        response = gemini.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini explanation error: {e}")
        return _fallback_explanation(best_route, aggregated_scores)


def _fallback_explanation(best_route: dict, scores: list[dict]) -> str:
    route_id = best_route.get("route_id", "unknown")
    dist = best_route.get("distance_km", 0)
    dur = best_route.get("duration_hours", 0)
    return (
        f"Route {route_id} was selected as the optimal path "
        f"({dist} km, ~{dur} hours). It offers the best balance of distance, "
        f"duration, and risk across {len(scores)} evaluated candidates."
    )


# ─── Reroute Evaluator ────────────────────────────────────────────────────────

async def evaluate_reroute(best_route: dict, risks: dict) -> dict:
    """
    Evaluates whether the selected route is acceptable or if rerouting is needed.

    Args:
        best_route: The currently selected best route
        risks: Aggregated risk data for the route

    Returns:
        dict with needs_reroute (bool) and reason (str)
    """
    gemini = _get_gemini_client()

    # Quick heuristic check first
    total_risk = risks.get("total_risk", 0)
    if total_risk > 0.75:
        return {
            "needs_reroute": True,
            "reason": f"Total risk score {total_risk:.2f} exceeds safety threshold (0.75). Rerouting strongly recommended.",
        }
    if total_risk < 0.3:
        return {
            "needs_reroute": False,
            "reason": f"Total risk score {total_risk:.2f} is within acceptable range. Route is safe to proceed.",
        }

    # For borderline cases, use LLM
    if not gemini:
        return {
            "needs_reroute": total_risk > 0.5,
            "reason": f"Risk score {total_risk:.2f} — {'rerouting recommended' if total_risk > 0.5 else 'acceptable risk level'}.",
        }

    prompt = f"""You are a Route Safety Monitor AI. Evaluate whether this route needs rerouting.

ROUTE: {best_route.get('route_id')}
Distance: {best_route.get('distance_km')} km
Duration: {best_route.get('duration_hours')} hours

RISK SCORES:
- Weather Risk: {risks.get('weather_risk', 0):.2f}
- Traffic Risk: {risks.get('traffic_risk', 0):.2f}
- News/Geopolitical Risk: {risks.get('news_risk', 0):.2f}
- Total Combined Risk: {total_risk:.2f}

Should this route be used, or should the system search for alternatives?
Return a JSON object:
{{
    "needs_reroute": <boolean>,
    "reason": "<brief explanation>"
}}"""

    try:
        response = gemini.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        result = json.loads(response.text)
        return {
            "needs_reroute": bool(result.get("needs_reroute", False)),
            "reason": result.get("reason", "Evaluation complete."),
        }
    except Exception as e:
        logger.error(f"Gemini reroute evaluation error: {e}")
        return {
            "needs_reroute": total_risk > 0.5,
            "reason": f"Fallback evaluation: risk {total_risk:.2f}.",
        }
