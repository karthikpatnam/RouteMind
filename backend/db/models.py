from sqlalchemy import Column, String, Float, Integer, JSON
from .database import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(String, primary_key=True, index=True)
    route_id = Column(String, index=True)
    risk_score = Column(Float)
    confidence = Column(Float)
    recommendation = Column(String)
    raw_intelligence = Column(JSON) # Stores what the agents found
    alternative_route = Column(JSON, nullable=True)
