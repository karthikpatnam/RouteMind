from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from graph.maritime_graph import find_route, list_ports

router = APIRouter(prefix="/api/route", tags=["routing"])

class RouteRequest(BaseModel):
    origin: str
    destination: str
    via: Optional[str] = None
    extra_risk: Optional[dict[str, float]] = None

@router.post("/compute")
async def compute_route(req: RouteRequest):
    result = find_route(req.origin, req.destination, req.extra_risk, req.via)
    return result

@router.get("/ports")
async def get_ports():
    return {"ports": list_ports()}

@router.get("/risk-zones")
async def get_risk_zones():
    return {"zones": [
        {"id":"storm-atl","label":"Category 5 Storm","severity":"critical","coords":[[-45,50],[-45,60],[-15,60],[-15,50]],"color":"#3b82f6"},
        {"id":"piracy-gulf","label":"High Piracy – Gulf of Aden","severity":"high","coords":[[43,10],[43,15],[55,15],[55,10]],"color":"#ef4444"},
        {"id":"piracy-som","label":"Active Piracy – Somali Coast","severity":"high","coords":[[45,5],[45,12],[55,12],[55,5]],"color":"#ef4444"},
        {"id":"traffic-suez","label":"Extreme Congestion – Suez","severity":"medium","coords":[[32,29],[32,33],[33,33],[33,29]],"color":"#f59e0b"},
        {"id":"storm-pac","label":"Typhoon Warning Zone","severity":"critical","coords":[[120,18],[120,28],[140,28],[140,18]],"color":"#3b82f6"},
    ]}
