"""
RestoNext MX - Analytics API Routes
AI-powered demand forecasting and Business Intelligence endpoints
"""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException

from app.core.database import get_db
from app.core.security import get_current_user, require_manager_or_admin
from app.models.models import User
from app.services.forecasting import get_forecast_for_ingredient
from app.services.analytics_service import (
    get_sales_by_hour,
    get_top_profitable_dishes,
    get_sales_comparison,
    get_kpis,
    get_sales_by_category
)
from app.schemas.schemas import ForecastResponse
from app.schemas.analytics_schemas import (
    SalesByHourResponse,
    TopDishesResponse,
    SalesComparisonResponse,
    KPIResponse,
    SalesByCategoryResponse
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/analytics", tags=["Analytics - AI & BI"])


# ============================================
# AI Forecasting Endpoints
# ============================================

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


# ============================================
# Business Intelligence Endpoints
# ============================================

@router.get("/sales-by-hour", response_model=SalesByHourResponse)
async def api_get_sales_by_hour(
    start_date: datetime = Query(
        default=None,
        description="Start date for analysis (defaults to 7 days ago)"
    ),
    end_date: datetime = Query(
        default=None,
        description="End date for analysis (defaults to now)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get sales aggregated by hour and day of week for heatmap visualization.
    
    Returns data for a 7-day x 24-hour grid showing peak sales hours.
    Useful for staffing optimization and understanding customer patterns.
    """
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=7)
    
    result = await get_sales_by_hour(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


@router.get("/top-dishes", response_model=TopDishesResponse)
async def api_get_top_dishes(
    start_date: datetime = Query(
        default=None,
        description="Start date for analysis (defaults to 30 days ago)"
    ),
    end_date: datetime = Query(
        default=None,
        description="End date for analysis (defaults to now)"
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
        description="Number of dishes to return"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get top dishes ranked by profitability.
    
    Calculates: Revenue - Ingredient Cost (from recipes)
    
    Returns profit margin percentage for menu optimization decisions.
    Helps identify high-margin dishes for promotions and low-margin 
    dishes that may need recipe adjustments.
    """
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_top_profitable_dishes(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    
    return result


@router.get("/sales-comparison", response_model=SalesComparisonResponse)
async def api_get_sales_comparison(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Compare current week's sales with previous week.
    
    Returns:
    - Daily sales breakdown for both weeks
    - Total sales for each week
    - Percentage change vs previous week
    
    Useful for trend analysis and identifying growth patterns.
    """
    result = await get_sales_comparison(
        db=db,
        tenant_id=current_user.tenant_id
    )
    
    return result


@router.get("/kpis", response_model=KPIResponse)
async def api_get_kpis(
    start_date: datetime = Query(
        default=None,
        description="Start date for KPI calculation (defaults to 30 days ago)"
    ),
    end_date: datetime = Query(
        default=None,
        description="End date for KPI calculation (defaults to now)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get Key Performance Indicators for dashboard cards.
    
    Returns:
    - **average_ticket**: Average order total in MXN
    - **total_sales**: Total revenue in MXN
    - **total_orders**: Number of paid orders
    - **food_cost_percentage**: COGS / Revenue * 100
    - **average_orders_per_day**: Activity metric
    - **busiest_hour**: Peak hour (0-23)
    - **busiest_day**: Peak day of week
    
    Industry benchmark: Food cost should be 28-35% for profitability.
    """
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_kpis(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


@router.get("/sales-by-category", response_model=SalesByCategoryResponse)
async def api_get_sales_by_category(
    start_date: datetime = Query(
        default=None,
        description="Start date for analysis (defaults to 30 days ago)"
    ),
    end_date: datetime = Query(
        default=None,
        description="End date for analysis (defaults to now)"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get sales distribution by menu category for pie chart.
    
    Returns percentage breakdown of sales by category.
    Helps identify which menu sections drive the most revenue.
    """
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_sales_by_category(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result

