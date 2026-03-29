from fastapi import APIRouter, Query
from pydantic import BaseModel
from agents.weather_intelligence import query_weather_agent
from agents.weather import fetch_marine_weather

router = APIRouter(prefix="/api/weather", tags=["Weather Intelligence Agent"])

class WeatherQuery(BaseModel):
    query: str

@router.post("/query")
async def weather_query(req: WeatherQuery):
    """
    Accepts a natural language query and returns a structured weather intelligence
    assessment with supply chain risk level and recommendations.
    """
    result = await query_weather_agent(req.query)
    return {"status": "success", "data": result}

@router.get("/marine")
async def get_marine_weather(
    lat: float = Query(..., description="Latitude of vessel position"),
    lng: float = Query(..., description="Longitude of vessel position"),
):
    """
    Returns comprehensive live marine + atmospheric weather for a given coordinate.
    Called by the frontend every 60 seconds per active vessel.
    Includes: wave_height, swell_height, wind_speed, precipitation, visibility,
    severity label (calm/moderate/rough/severe), and a risk_factor (0.0–1.0).
    """
    data = await fetch_marine_weather(lat, lng)
    return {"status": "success", "data": data}
