import os
import httpx
import logging
import random
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

# Initialize single instance of VADER
analyzer = SentimentIntensityAnalyzer()

async def scout_maritime_news(region: str):
    """
    Uses Tavily API (if provided) or falls back to basic keyword simulation.
    Now enriched with local VADER NLP to pre-process text sentiment and filter out noise.
    """
    
    tavily_key = os.environ.get("TAVILY_API_KEY")
    
    if tavily_key:
        query = f"maritime logistics incidents supply chain {region} today"
        url = "https://api.tavily.com/search"
        data = {
            "api_key": tavily_key,
            "query": query,
            "search_depth": "basic",
            "max_results": 3
        }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=data, timeout=10.0)
                if res.status_code == 200:
                    results = res.json().get('results', [])
                    if results:
                        scored_results = []
                        for r in results:
                            content = r.get('content', '') or r.get('title', '')
                            # VADER compound score ranges from -1 (most extreme negative) to +1 (most extreme positive)
                            score = analyzer.polarity_scores(content)['compound']
                            scored_results.append({
                                "title": r.get('title'),
                                "content": r.get('content'),
                                "sentiment_score": score
                            })
                        
                        # Filter strictly for negative disruptions (score < -0.2)
                        negative_news = [r for r in scored_results if r["sentiment_score"] < -0.2]
                        
                        if negative_news:
                            summary = " | ".join([r["content"] for r in negative_news])
                            headlines = [f"{r['title']} (Sent: {round(r['sentiment_score'], 2)})" for r in negative_news]
                            avg_sentiment = sum(r["sentiment_score"] for r in negative_news) / len(negative_news)
                            return {
                                "status": "success",
                                "summary": summary,
                                "headlines": headlines,
                                "local_sentiment_score": round(avg_sentiment, 3),
                                "disruption_detected": True
                            }
                        else:
                            # If no negative news, calculate average overall sentiment and return benign status
                            avg_sentiment = sum(r["sentiment_score"] for r in scored_results) / len(scored_results)
                            return {
                                "status": "success",
                                "summary": "OSINT scanned globally. No significant negative maritime disruptions detected for region.",
                                "headlines": [r['title'] for r in scored_results],
                                "local_sentiment_score": round(avg_sentiment, 3),
                                "disruption_detected": False
                            }
        except Exception as e:
            logger.error(f"Tavily Search Error: {e}")
            
    
    # If no key, run mock logic with mock sentiment values
    simulated_scenarios = [
        ("Unrest reported near port labor negotiations.", -0.65),
        ("Piracy attempts up 15% in sector. High risk warnings issued.", -0.80),
        ("No significant maritime incidents tracked in OSINT feeds. Clear sailing.", 0.20),
        ("Heavy congestion clearing up naturally, slight delays expected.", -0.15)
    ]
    sim_content, sim_score = random.choice(simulated_scenarios)
    
    return {
        "status": "simulated",
        "summary": sim_content,
        "headlines": [f"Daily OSINT Bulletin for {region}"],
        "local_sentiment_score": sim_score,
        "disruption_detected": sim_score < -0.2
    }
