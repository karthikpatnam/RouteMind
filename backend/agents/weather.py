import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Severity thresholds
def _compute_severity(wave_height: float, wind_speed: float, precip: float) -> str:
    if wave_height >= 6.0 or wind_speed >= 25.0:
        return "severe"
    if wave_height >= 3.5 or wind_speed >= 15.0 or precip >= 10.0:
        return "rough"
    if wave_height >= 1.5 or wind_speed >= 8.0 or precip >= 2.0:
        return "moderate"
    return "calm"

def _compute_risk_factor(wave_height: float, wind_speed: float, precip: float, visibility: float) -> float:
    """
    Returns a float 0.0 – 1.0 representing weather-driven risk.
    This is additive on top of the route's base risk score.
    """
    score = 0.0
    # Wave height contribution (0 – 0.40)
    score += min(wave_height / 10.0, 1.0) * 0.40
    # Wind speed contribution (0 – 0.30)
    score += min(wind_speed / 30.0, 1.0) * 0.30
    # Precipitation contribution (0 – 0.20)
    score += min(precip / 20.0, 1.0) * 0.20
    # Low visibility contribution (0 – 0.10)
    vis_risk = max(0.0, 1.0 - visibility / 10000.0)  # 10km = no risk
    score += vis_risk * 0.10
    return round(min(score, 1.0), 3)

async def fetch_marine_weather(lat: float, lng: float) -> dict:
    """
    Fetches comprehensive marine + atmospheric weather for a coordinate.
    Uses Open-Meteo Marine API (no key required) + Open-Meteo Forecast API.
    Returns a unified dict with severity, risk_factor, and all key metrics.
    """
    marine_url = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lng}"
        f"&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,ocean_current_velocity"
        f"&forecast_days=1"
    )
    atmos_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        f"&hourly=wind_speed_10m,wind_direction_10m,precipitation,visibility,weather_code"
        f"&forecast_days=1"
        f"&wind_speed_unit=ms"  # metres per second
    )

    wave_height = 0.0
    wave_dir = 0.0
    wave_period = 0.0
    swell_height = 0.0
    swell_dir = 0.0
    ocean_current = 0.0
    wind_speed = 0.0
    wind_dir = 0.0
    precipitation = 0.0
    visibility = 10000.0
    weather_code = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            marine_resp, atmos_resp = await _fetch_both(client, marine_url, atmos_url)

            if marine_resp and marine_resp.status_code == 200:
                m = marine_resp.json().get("hourly", {})
                wave_height   = _safe(m.get("wave_height",         [0.0]), 0)
                wave_dir      = _safe(m.get("wave_direction",      [0.0]), 0)
                wave_period   = _safe(m.get("wave_period",         [0.0]), 0)
                swell_height  = _safe(m.get("swell_wave_height",   [0.0]), 0)
                swell_dir     = _safe(m.get("swell_wave_direction",[0.0]), 0)
                ocean_current = _safe(m.get("ocean_current_velocity",[0.0]), 0)
            else:
                logger.warning(f"Marine API failed for {lat},{lng}: {marine_resp.status_code if marine_resp else 'no response'}")

            if atmos_resp and atmos_resp.status_code == 200:
                a = atmos_resp.json().get("hourly", {})
                wind_speed   = _safe(a.get("wind_speed_10m",  [0.0]), 0)
                wind_dir     = _safe(a.get("wind_direction_10m",[0.0]), 0)
                precipitation = _safe(a.get("precipitation",  [0.0]), 0)
                visibility   = _safe(a.get("visibility",      [10000.0]), 0)
                weather_code = int(_safe(a.get("weather_code",[0]), 0))
            else:
                logger.warning(f"Atmos API failed for {lat},{lng}: {atmos_resp.status_code if atmos_resp else 'no response'}")

    except Exception as e:
        logger.error(f"Weather fetch error for {lat},{lng}: {e}")
        # Return fallback with clear status
        return _fallback(lat, lng)

    severity = _compute_severity(wave_height, wind_speed, precipitation)
    risk_factor = _compute_risk_factor(wave_height, wind_speed, precipitation, visibility)

    return {
        "status": "live",
        "lat": lat,
        "lng": lng,
        "severity": severity,          # calm | moderate | rough | severe
        "risk_factor": risk_factor,    # 0.0 – 1.0
        "wave_height": round(wave_height, 1),
        "wave_direction": round(wave_dir, 0),
        "wave_period": round(wave_period, 1),
        "swell_height": round(swell_height, 1),
        "swell_direction": round(swell_dir, 0),
        "ocean_current": round(ocean_current, 1),
        "wind_speed": round(wind_speed, 1),      # m/s
        "wind_direction": round(wind_dir, 0),
        "wind_speed_kts": round(wind_speed * 1.944, 1),  # knots
        "precipitation": round(precipitation, 1),
        "visibility": round(visibility, 0),
        "weather_code": weather_code,
        "summary": _build_summary(severity, wave_height, wind_speed, precipitation),
    }

async def _fetch_both(client: httpx.AsyncClient, url1: str, url2: str):
    import asyncio
    results = await asyncio.gather(
        _safe_get(client, url1),
        _safe_get(client, url2),
        return_exceptions=True
    )
    r1 = results[0] if not isinstance(results[0], Exception) else None
    r2 = results[1] if not isinstance(results[1], Exception) else None
    return r1, r2

async def _safe_get(client: httpx.AsyncClient, url: str) -> Optional[httpx.Response]:
    try:
        return await client.get(url)
    except Exception as e:
        logger.error(f"HTTP GET failed: {url} — {e}")
        return None

def _safe(lst: list, idx: int, default: float = 0.0) -> float:
    try:
        v = lst[idx]
        return float(v) if v is not None else default
    except (IndexError, TypeError, ValueError):
        return default

def _build_summary(severity: str, wave_height: float, wind_speed: float, precip: float) -> str:
    labels = {
        "calm":     "Calm seas. Optimal transit conditions.",
        "moderate": f"Moderate conditions. Waves {wave_height:.1f}m, wind {wind_speed:.0f} m/s.",
        "rough":    f"Rough sea state. Waves {wave_height:.1f}m, wind {wind_speed:.0f} m/s. Monitor closely.",
        "severe":   f"Severe weather. Waves {wave_height:.1f}m, wind {wind_speed:.0f} m/s. Rerouting advised.",
    }
    return labels.get(severity, "Conditions unknown.")

def _fallback(lat: float, lng: float) -> dict:
    """Graceful fallback when APIs are unreachable."""
    return {
        "status": "fallback",
        "lat": lat,
        "lng": lng,
        "severity": "moderate",
        "risk_factor": 0.2,
        "wave_height": 1.5,
        "wave_direction": 180.0,
        "wave_period": 8.0,
        "swell_height": 1.0,
        "swell_direction": 200.0,
        "ocean_current": 0.5,
        "wind_speed": 6.0,
        "wind_direction": 270.0,
        "wind_speed_kts": 11.7,
        "precipitation": 0.0,
        "visibility": 10000.0,
        "weather_code": 0,
        "summary": "Weather data unavailable. Using estimated moderate conditions.",
    }
