
import json
import logging
from datetime import date
from typing import Dict, Any, Optional

import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class DemandAnalysis(BaseModel):
    demand_multiplier: float
    analysis_summary: str

class AIService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.perplexity_api_key
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.model = "sonar-pro" # Capable of online search

    async def analyze_demand_context(
        self, 
        location: str, 
        start_date: date, 
        end_date: date
    ) -> DemandAnalysis:
        """
        Consults Perplexity AI to strictly analyze events, holidays, and weather
        that might impact restaurant demand in the given location and date range.
        
        Returns a multiplier (e.g., 1.2 for 20% increase) and a summary.
        """
        if not self.api_key:
            logger.warning("Perplexity API Key not configured. Returning default demand analysis.")
            return DemandAnalysis(demand_multiplier=1.0, analysis_summary="AI Service disabled (No API Key)")

        system_prompt = (
            "You are an expert Restaurant Demand Planner. "
            "Your job is to analyze external factors (holidays, major local events, extreme weather, sports events) "
            "for a specific location and date range that would impact restaurant traffic. "
            "Return ONLY a JSON object with 'demand_multiplier' (float, 1.0 is neutral, >1.0 is high demand, <1.0 is low) "
            "and 'analysis_summary' (concise explanation). "
            "Be conservative: only predict >1.2 or <0.8 if there is a massive event (e.g. Super Bowl, National Holiday)."
        )

        user_prompt = (
            f"Location: {location}\n"
            f"Dates: {start_date} to {end_date}\n"
            "Analyze the demand impact."
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.2
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Perplexity API Error: {response.status_code} - {response.text}")
                    return DemandAnalysis(demand_multiplier=1.0, analysis_summary="AI Analysis Failed (API Error)")

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Cleanup markdown code blocks if present
                clean_content = content.replace("```json", "").replace("```", "").strip()
                
                try:
                    result = json.loads(clean_content)
                    return DemandAnalysis(
                        demand_multiplier=float(result.get("demand_multiplier", 1.0)),
                        analysis_summary=result.get("analysis_summary", "No summary provided")
                    )
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Failed to parse AI response: {content}")
                    return DemandAnalysis(demand_multiplier=1.0, analysis_summary="AI Parsing Failed")

        except httpx.RequestError as e:
            logger.error(f"Perplexity Connection Error: {str(e)}")
            return DemandAnalysis(demand_multiplier=1.0, analysis_summary="AI Connection Failed")
        except Exception as e:
            logger.exception("Unexpected error in AIService")
            return DemandAnalysis(demand_multiplier=1.0, analysis_summary="System Error")
