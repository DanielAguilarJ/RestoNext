"""
RestoNext MX - Analytics API Routes
AI-powered demand forecasting
"""

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, require_manager_or_admin
from app.models.models import User
from app.services.forecasting import get_forecast_for_ingredient
from app.schemas.schemas import ForecastResponse

router = APIRouter(prefix="/analytics", tags=["Analytics - AI"])


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    ingredient: str = Query(..., description="Ingredient name to forecast"),
    days_ahead: int = Query(7, ge=1, le=30, description="Days to forecast"),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get AI-powered demand forecast for an ingredient.
    
    Uses Facebook Prophet with:
    - Mexican holiday adjustments
    - Weekly seasonality (weekends boost)
    - Payday seasonality (15th and end of month)
    
    Example ingredients:
    - Aguacate
    - Carne
    - Tortilla
    - Queso
    - Tomate
    """
    forecast = await get_forecast_for_ingredient(
        tenant_id=str(current_user.tenant_id),
        ingredient=ingredient,
    )
    
    return ForecastResponse(
        ingredient=forecast["ingredient"],
        predictions=forecast.get("predictions", []),
    )


@router.get("/forecast/batch")
async def get_batch_forecast(
    ingredients: str = Query(..., description="Comma-separated ingredient names"),
    days_ahead: int = Query(7, ge=1, le=30),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get forecasts for multiple ingredients at once.
    
    Example: /analytics/forecast/batch?ingredients=Aguacate,Carne,Tortilla
    """
    ingredient_list = [i.strip() for i in ingredients.split(",")]
    
    results = []
    for ingredient in ingredient_list:
        forecast = await get_forecast_for_ingredient(
            tenant_id=str(current_user.tenant_id),
            ingredient=ingredient,
        )
        results.append({
            "ingredient": ingredient,
            "predictions": forecast.get("predictions", []),
        })
    
    return {"forecasts": results}
