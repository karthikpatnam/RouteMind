import os
import json
from google import genai
from google.genai import types

# Use Gemini 2.5 Flash as it is extremely fast and capable of JSON structured output
GEMINI_MODEL = "gemini-2.5-flash"

async def run_routing_engine(weather_data: dict, news_data: dict, traffic_data: dict, graph_route: dict, route_details: dict):
    """
    Acts as the Core Reinforcement Agent. 
    Ingests all the isolated agent intelligence alongside the mathematical NetworkX baseline route.
    """
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback to a mock simulation if user hasn't put key in yet to prevent crash
        return {
            "riskScore": 85,
            "confidence": 92,
            "recommendation": "reroute",
            "alternativeRoute": {
                "timeSaved": 24,
                "costReduction": 12,
                "riskReduction": 75
            }
        }
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are the Core Routing AI for a global maritime logistics platform.
    Analyze the incoming sensory intelligence for the following vessel route:
    ROUTE DETAILS: {json.dumps(route_details)}
    
    1. WEATHER AGENT REPORT: {json.dumps(weather_data)}
    2. NEWS AGENT REPORT: {json.dumps(news_data)}
    3. TRAFFIC AGENT REPORT: {json.dumps(traffic_data)}
    
    === GRAPH ENGINE BASELINE ===
    Our backend NetworkX pathfinding system has computed the mathematical shortest route factoring currently known risk weights:
    {json.dumps(graph_route)}
    ============================
    
    Based on the intelligence and the mathematical baseline path, decide if we should 'continue', 'delay', or 'reroute'.
    If 'reroute', you MUST supply an alternativeRoute block.
    
    Return a JSON object containing EXACTLY:
    - riskScore (number 0-100)
    - confidence (number 0-100)
    - recommendation (string: 'continue', 'delay', or 'reroute')
    - reasoning (string: brief explanation of why you made this decision)
    - alternativeRoute (object with timeSaved, costReduction, riskReduction as numbers) (only if recommendation is reroute)
    """
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )
    
    return json.loads(response.text)
