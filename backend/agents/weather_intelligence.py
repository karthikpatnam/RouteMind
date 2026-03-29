import os
import json
import httpx
from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-2.5-flash"

async def query_weather_agent(user_query: str) -> dict:
    """
    NLP driven Weather Intelligence Agent for supply chain predicting.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    owm_key = os.environ.get("OPENWEATHER_API_KEY")
    
    if not gemini_key or not owm_key:
        return {
            "summary": "System offline: API Keys missing.",
            "risk_level": "UNKNOWN",
            "impact": "Cannot process query",
            "recommendation": "Please configure GEMINI_API_KEY and OPENWEATHER_API_KEY in the backend .env"
        }
        
    client = genai.Client(api_key=gemini_key)
    
    extract_prompt = f"""
    Extract the geographical city name from the following logistics query.
    If no city is found, return "unknown".
    Query: "{user_query}"
    
    Return EXACTLY a JSON object with this key:
    {{
      "location": "City Name"
    }}
    """
    
    try:
        # Phase 1: NLU extraction
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=extract_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        extract_result = json.loads(response.text)
        location = extract_result.get("location", "unknown")
        
        if location.lower() == "unknown":
            return {
                "summary": "I couldn't identify a location in your query.",
                "risk_level": "LOW",
                "impact": "None",
                "recommendation": "Please provide a valid city name, like 'Will it rain in Mumbai tomorrow?'"
            }
            
        # Phase 2: Fetch OpenWeather Data (5-day / 3-hour forecast)
        owm_url = f"https://api.openweathermap.org/data/2.5/forecast?q={location}&appid={owm_key}&units=metric"
        
        async with httpx.AsyncClient() as http_client:
            owm_resp = await http_client.get(owm_url, timeout=10.0)
            
            if owm_resp.status_code != 200:
                return {
                    "summary": f"Could not retrieve weather data for {location}.",
                    "risk_level": "UNKNOWN",
                    "impact": f"API Error {owm_resp.status_code}",
                    "recommendation": "Check the city name or OpenWeather API limits."
                }
            
            weather_data = owm_resp.json()
            
            # Slice to first 8 items (24 hours) to keep prompt size small
            forecast_snippet = []
            for item in weather_data.get("list", [])[:8]:
                forecast_snippet.append({
                    "dt_txt": item.get("dt_txt"),
                    "temp": item.get("main", {}).get("temp"),
                    "humidity": item.get("main", {}).get("humidity"),
                    "weather": item.get("weather", [{}])[0].get("description"),
                    "wind_speed": item.get("wind", {}).get("speed"),
                    "pop": item.get("pop", 0) # Probability of precipitation
                })
                
        # Phase 3: Final Analysis & Risk Decision Logic
        analysis_prompt = f"""
        You are a Weather Intelligence AI for a global supply chain platform.
        Analyze the following weather forecast for '{location}' in the context of the user's query.
        
        USER QUERY: "{user_query}"
        
        WEATHER FORECAST (Next 24 Hours):
        {json.dumps(forecast_snippet, indent=2)}
        
        DECISION RULES:
        - If rain probability (pop) > 0.60, or heavy rain/storm is in the description -> Flag delivery risk.
        - If temperature > 40°C -> Suggest cold-chain precautions.
        - If wind_speed > 20 m/s -> Recommend route delay or rerouting.
        
        Respond ONLY with a valid JSON object matching this schema EXACTLY:
        {{
            "summary": "Brief 1-2 sentence localized weather summary",
            "risk_level": "LOW", // MUST BE "LOW", "MEDIUM", or "HIGH"
            "impact": "Supply chain impact description (e.g. Delivery delays likely)",
            "recommendation": "Actionable business recommendation for logistics planners."
        }}
        """
        
        final_response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=analysis_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        return json.loads(final_response.text)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "summary": "An error occurred during AI analysis.",
            "risk_level": "UNKNOWN",
            "impact": "Engine processing failure",
            "recommendation": "Retry the query or check backend logs."
        }
