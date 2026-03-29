import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env before anything else imports them
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import json
import asyncio

from agents.weather import fetch_marine_weather
from agents.news import scout_maritime_news
from agents.traffic import analyze_maritime_traffic
from agents.engine import run_routing_engine
from db.database import supabase
from routers.route import router as route_router
from routers.analytics import router as analytics_router
from routers.weather_agent import router as weather_agent_router
from routers.optimize import router as optimize_router
from graph.maritime_graph import find_route
import uuid

# Setup lifecycle
async def lifespan(app: FastAPI):
    print("Initializing Multi-Agent Logic Core...")
    yield
    print("Shutting down Agent Logic Core...")

app = FastAPI(title="RouteMind AI Agents API", version="1.0.0", lifespan=lifespan)

# Allow CORS for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(route_router)
app.include_router(analytics_router)
app.include_router(weather_agent_router)
app.include_router(optimize_router)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "RouteMind API is streaming."}

@app.websocket("/ws/agent-logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for any inbound pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class TriggerRequest(BaseModel):
    route_id: str
    lat: float
    lng: float
    origin: str
    destination: str

@app.post("/api/agents/trigger")
async def trigger_agents(req: TriggerRequest):
    # Step 1: Broadcast to UI that agents woke up
    await manager.broadcast(json.dumps({"agent": "System", "msg": f"Triggering MAS cycle for Route: {req.route_id}..."}))
    
    # Step 2: Concurrently fire all intelligence scraping agents!
    await manager.broadcast(json.dumps({"agent": "Weather", "msg": f"Polling Open-Meteo at coords {req.lat},{req.lng}..."}))
    await manager.broadcast(json.dumps({"agent": "News", "msg": f"Searching global OSINT databases for region {req.origin}..."}))
    await manager.broadcast(json.dumps({"agent": "Traffic", "msg": "Running geospatial chokepoint AIS scan..."}))
    
    weather_report, news_report, traffic_report = await asyncio.gather(
        fetch_marine_weather(req.lat, req.lng),
        scout_maritime_news(req.origin),
        analyze_maritime_traffic(req.origin, req.lat, req.lng)
    )
    
    await manager.broadcast(json.dumps({"agent": "System", "msg": "Sensory agents completed. Dispatching intelligence payload to Gemini RL logic core..."}))
    await manager.broadcast(json.dumps({"agent": "Routing", "msg": f"Computing NetworkX Dijkstra path from {req.origin} to {req.destination}..."}))
    
    extra_risk_dict = {}
    
    # 1. Weather impact — use risk_factor and all metrics
    wx_risk = weather_report.get("risk_factor", 0.0)
    wx_wind = weather_report.get("wind_speed", weather_report.get("current_weather", {}).get("windspeed", 0))
    wx_wave = weather_report.get("wave_height", 0)
    wx_precip = weather_report.get("precipitation", 0)
    if wx_risk > 0.4 or wx_wind > 20 or wx_wave > 4.0:
        extra_risk_dict[f"{req.origin}->{req.destination}"] = extra_risk_dict.get(f"{req.origin}->{req.destination}", 1.0) * (1.0 + wx_risk)
    elif wx_wind > 10 or wx_wave > 2.0 or wx_precip > 5:
        extra_risk_dict[f"{req.origin}->{req.destination}"] = extra_risk_dict.get(f"{req.origin}->{req.destination}", 1.0) * 1.2
        
    # 2. Local sentiment impact (New in Phase 4)
    sentiment_score = news_report.get("local_sentiment_score", 0)
    if news_report.get("disruption_detected") and sentiment_score < -0.4:
        # Heavily penalize the lane if news is very negative (sentiment < -0.4)
        extra_risk_dict[f"{req.origin}->{req.destination}"] = extra_risk_dict.get(f"{req.origin}->{req.destination}", 1.0) * 2.0
        
    # 3. Traffic congestion impact
    if traffic_report and traffic_report.get("congestionScore", 0) > 75:
        extra_risk_dict[f"{req.origin}->{req.destination}"] = extra_risk_dict.get(f"{req.origin}->{req.destination}", 1.0) * 1.3
    
    graph_route = find_route(req.origin, req.destination, extra_risk=extra_risk_dict)
    
    # Step 3: Pass to core Engine
    decision_json = await run_routing_engine(
        weather_data=weather_report,
        news_data=news_report,
        traffic_data=traffic_report,
        graph_route=graph_route,
        route_details={"id": req.route_id, "lat": req.lat, "lng": req.lng, "origin": req.origin, "destination": req.destination}
    )
    
    await manager.broadcast(json.dumps({"agent": "Routing", "msg": f"Decision Rendered. Risk Score: {decision_json.get('riskScore', 'N/A')}. Recommendation: {decision_json.get('recommendation', 'N/A')}"}))
    
    # Save the Gemini output directly to Supabase PostgREST
    if supabase is not None:
        try:
            log_entry = {
                "route_id": req.route_id,
                "risk_score": float(decision_json.get("riskScore", 0)),
                "confidence": float(decision_json.get("confidence", 0)),
                "recommendation": decision_json.get("recommendation", "Unknown"),
                "reasoning": decision_json.get("reasoning", "Vessel intelligence analyzed. Proceeding accordingly."),
                "raw_data": {
                    "weather": weather_report,
                    "news": news_report,
                    "traffic": traffic_report
                },
                "alternative_route": decision_json.get("alternativeRoute", None)
            }
            # Note: insert.execute() handles the network request to your dashboard
            supabase.table("prediction_logs").insert(log_entry).execute()
        except Exception as e:
            print("Failed to save to Supabase:", e)
    
    return {"status": "success", "prediction": decision_json}


