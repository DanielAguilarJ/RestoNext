
import json
import logging
from datetime import date
from typing import Dict, Any, Optional, List

import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class DemandAnalysis(BaseModel):
    demand_multiplier: float
    analysis_summary: str

class MenuItemOptimization(BaseModel):
    suggested_description: str
    market_price_analysis: str

class CateringProposal(BaseModel):
    suggested_menu: List[Dict[str, Any]]
    sales_pitch: str

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

    async def optimize_menu_item(
        self,
        item_name: str,
        ingredients: List[str],
        current_price: float,
        location: str
    ) -> MenuItemOptimization:
        """
        Expert Gastronomic Copywriter and Market Analyst.
        1. Generates persuasive description (Neuromarketing).
        2. Analyzes market prices via Perplexity search.
        """
        if not self.api_key:
            return MenuItemOptimization(
                suggested_description="AI Service Disabled",
                market_price_analysis="N/A"
            )

        system_prompt = (
            "You are an expert Gastronomic Copywriter and Market Analyst for top-tier restaurants. "
            "1. Generate a persuasive, sensory-rich description (Neuromarketing) for the dish. "
            "2. Perform a real-time web search to find the average market price for this dish in the given location. "
            "3. Return ONLY a JSON object with 'suggested_description' and 'market_price_analysis' (a brief sentence comparing the current_price with market average)."
        )

        user_prompt = (
            f"Dish: {item_name}\n"
            f"Ingredients: {', '.join(ingredients)}\n"
            f"Current Price: {current_price}\n"
            f"Location: {location}\n"
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.5
                    }
                )
                
                content = response.json()["choices"][0]["message"]["content"]
                clean_content = content.replace("```json", "").replace("```", "").strip()
                result = json.loads(clean_content)
                
                return MenuItemOptimization(**result)
        except Exception as e:
            logger.error(f"Menu Optimization AI Failed: {e}")
            return MenuItemOptimization(
                suggested_description=f"Sensational {item_name} made with fresh ingredients.",
                market_price_analysis="Unable to perform market analysis at this moment."
            )

    async def plan_catering_event(
        self,
        event_type: str,
        guest_count: int,
        budget_per_person: float,
        theme: str,
        location: str,
        available_menu_items: List[str]
    ) -> CateringProposal:
        """
        AI Event Planner.
        Generates a custom catering proposal blending current menu and new suggestions.
        """
        if not self.api_key:
            return CateringProposal(suggested_menu=[], sales_pitch="AI Service Disabled")

        system_prompt = (
            "You are a World-Class Catering Planner. "
            "1. Research current food trends for the event type and theme. "
            "2. Propose a menu (JSON list of items with 'name', 'source' [current_menu or ai_suggestion], and 'reason'). "
            "3. Write a high-converting Sales Pitch for the customer. "
            "4. Return ONLY a JSON object with 'suggested_menu' and 'sales_pitch'."
        )

        user_prompt = (
            f"Event: {event_type} for {guest_count} guests.\n"
            f"Budget: {budget_per_person} per person.\n"
            f"Theme: {theme}\n"
            f"Location: {location}\n"
            f"Our Current Menu items: {', '.join(available_menu_items)}\n"
        )

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3
                    }
                )
                
                content = response.json()["choices"][0]["message"]["content"]
                clean_content = content.replace("```json", "").replace("```", "").strip()
                result = json.loads(clean_content)
                
                return CateringProposal(**result)
        except Exception as e:
            logger.error(f"Catering Planning AI Failed: {e}")
            return CateringProposal(
                suggested_menu=[], 
                sales_pitch="Standard catering proposal pending manual review."
            )

    async def suggest_upsell(
        self,
        cart_items: List[str],
        available_menu_items: List[Dict[str, Any]],
        restaurant_type: str = "Mexican Restaurant",
        max_suggestions: int = 2
    ) -> List[Dict[str, Any]]:
        """
        AI-powered upselling suggestions based on cart contents.
        
        Analyzes current cart and recommends complementary items from
        the available menu that would pair well with the customer's order.
        
        Args:
            cart_items: List of item names currently in cart
            available_menu_items: List of menu items to suggest from
                Each item: {id, name, description, price, category}
            restaurant_type: Type of restaurant for context
            max_suggestions: Maximum number of suggestions to return
            
        Returns:
            List of suggested menu items with reason
            [{id, name, price, reason}, ...]
        """
        if not self.api_key:
            # Fallback: return random suggestions without AI
            import random
            available = [
                item for item in available_menu_items 
                if item.get("name") not in cart_items
            ]
            suggestions = random.sample(available, min(max_suggestions, len(available)))
            return [
                {
                    "id": s.get("id"),
                    "name": s.get("name"),
                    "price": s.get("price"),
                    "reason": "Sugerencia del chef"
                }
                for s in suggestions
            ]

        # Build menu context for AI
        menu_context = "\n".join([
            f"- {item['name']} (${item.get('price', 0)}) - {item.get('category', 'General')}"
            for item in available_menu_items
            if item.get("name") not in cart_items
        ][:20])  # Limit to 20 items to avoid token overflow

        system_prompt = (
            f"You are an expert upselling assistant for a {restaurant_type}. "
            "Analyze the customer's current order and suggest 2 complementary items from the menu that would enhance their experience. "
            "Consider food pairing (e.g., drinks with food, appetizers before mains, desserts after). "
            "Return ONLY a JSON array with exactly 2 items. Each item must have: "
            "'name' (exact match from menu), 'reason' (short, appetizing in Spanish, max 10 words). "
            "Example: [{\"name\": \"Cerveza Artesanal\", \"reason\": \"Perfecto maridaje con tu taco\"}]"
        )

        user_prompt = (
            f"Customer's cart: {', '.join(cart_items)}\n\n"
            f"Available menu items to suggest from:\n{menu_context}\n\n"
            "Suggest 2 complementary items."
        )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
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
                        "temperature": 0.4
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Upsell AI Error: {response.status_code}")
                    return []

                content = response.json()["choices"][0]["message"]["content"]
                clean_content = content.replace("```json", "").replace("```", "").strip()
                
                try:
                    suggestions = json.loads(clean_content)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse upsell response: {content}")
                    return []
                
                # Match AI suggestions with actual menu items
                result = []
                for suggestion in suggestions[:max_suggestions]:
                    suggested_name = suggestion.get("name", "")
                    # Find matching menu item
                    for item in available_menu_items:
                        if item.get("name", "").lower() == suggested_name.lower():
                            result.append({
                                "id": item.get("id"),
                                "name": item.get("name"),
                                "price": item.get("price"),
                                "image_url": item.get("image_url"),
                                "reason": suggestion.get("reason", "Sugerencia del chef")
                            })
                            break
                
                return result

        except httpx.RequestError as e:
            logger.error(f"Upsell AI Connection Error: {str(e)}")
            return []
        except Exception as e:
            logger.exception("Unexpected error in upsell suggestion")
            return []

