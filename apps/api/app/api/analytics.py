"""
RestoNext MX - Analytics API Routes
AI-powered demand forecasting and Business Intelligence endpoints
"""

from datetime import datetime, timedelta
from typing import List, Optional

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
    get_sales_by_category,
    get_kitchen_performance,
    get_live_operations,
    get_payment_analytics,
    get_order_source_analytics,
    get_unified_dashboard,
)
from app.schemas.schemas import ForecastResponse
from app.schemas.analytics_schemas import (
    SalesByHourResponse,
    TopDishesResponse,
    SalesComparisonResponse,
    KPIResponse,
    SalesByCategoryResponse,
    KitchenPerformanceResponse,
    LiveOperationsResponse,
    PaymentAnalyticsResponse,
    OrderSourceResponse,
    UnifiedDashboardResponse,
)
from app.services.ai_service import AIService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/analytics", tags=["Analytics - AI & BI"])


# ============================================
# Helper Functions
# ============================================

def normalize_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Normalize a datetime by removing timezone info if present.
    
    This fixes the asyncpg error: "can't subtract offset-naive and offset-aware datetimes"
    The database stores timestamps as TIMESTAMP WITHOUT TIME ZONE (naive),
    but the frontend sends ISO 8601 dates with timezone info (aware).
    
    Args:
        dt: A datetime object that may be offset-aware or offset-naive
        
    Returns:
        A naive datetime (without timezone info) or None
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        # Remove timezone info to make it naive
        return dt.replace(tzinfo=None)
    return dt


# ============================================
# AI Forecasting Endpoints
# ============================================

@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    ingredient: str = Query(..., description="Ingredient name to forecast"),
    days_ahead: int = Query(7, ge=1, le=30, description="Days to forecast"),
    db: AsyncSession = Depends(get_db),
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
        db_session=db,
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
    # Normalize dates to naive datetime to match DB column format
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
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
    # Normalize dates to naive datetime to match DB column format
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
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
    # Normalize dates to naive datetime to match DB column format
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
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
    # Normalize dates to naive datetime to match DB column format
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_sales_by_category(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


@router.get("/demand-context")
async def api_get_demand_context(
    location: str = Query(..., description="Location for demand analysis (e.g., 'Ciudad de México')"),
    start_date: datetime = Query(..., description="Start date for analysis"),
    end_date: datetime = Query(..., description="End date for analysis"),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get demand context analysis for a location and date range.
    
    Analyzes external factors that could impact restaurant demand:
    - Local events and holidays
    - Weather conditions
    - Day of week patterns
    - Seasonal trends
    
    Returns:
    - **demand_multiplier**: Factor to adjust demand forecast (1.0 = baseline)
    - **analysis_summary**: Human-readable analysis of demand factors
    
    Example: During a major holiday, demand_multiplier might be 1.5 (50% increase).
    """
    # Normalize dates
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    # AI Analysis
    ai_service = AIService()
    
    # Convert datetimes to dates for the AI service
    s_date = start_date.date() if start_date else datetime.utcnow().date()
    e_date = end_date.date() if end_date else datetime.utcnow().date()
    
    try:
        # Call Perplexity API via AIService
        ai_result = await ai_service.analyze_demand_context(
            location=location,
            start_date=s_date,
            end_date=e_date
        )
        
        return {
            "demand_multiplier": ai_result.demand_multiplier,
            "analysis_summary": ai_result.analysis_summary
        }
    except Exception as e:
        # Fallback to hardcoded logic if AI fails
        print(f"AI Service failed, falling back to basic logic: {e}")
        
        demand_multiplier = 1.0
        factors = []
        
        if start_date:
            # Weekend boost
            if start_date.weekday() >= 5:  # Saturday or Sunday
                demand_multiplier *= 1.2
                factors.append("fin de semana (+20%)")
            
            # End of month / payday boost
            if start_date.day == 15 or start_date.day >= 28:
                demand_multiplier *= 1.15
                factors.append("día de quincena (+15%)")
        
        analysis = f"Análisis básico (AI no disponible). "
        if factors:
            analysis += f"Factores: {', '.join(factors)}"
        else:
            analysis += "Demanda estándar."
        
        return {
            "demand_multiplier": round(demand_multiplier, 2),
            "analysis_summary": analysis
        }


# ============================================
# Kitchen / KDS Performance
# ============================================

@router.get("/kitchen-performance", response_model=KitchenPerformanceResponse)
async def api_get_kitchen_performance(
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
    Get Kitchen Display System performance metrics.
    
    Returns:
    - **avg_prep_minutes**: Average order preparation time
    - **median_prep_minutes**: Median prep time (less sensitive to outliers)
    - **p95_prep_minutes**: 95th percentile (worst case scenario)
    - **items_per_hour**: Kitchen throughput
    - **station_breakdown**: Items processed by station (kitchen vs bar)
    - **bottleneck**: Slow orders analysis (>20min)
    
    Use this to identify kitchen bottlenecks and optimize workflows.
    """
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=7)
    
    result = await get_kitchen_performance(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


# ============================================
# Real-time Operations Pulse
# ============================================

@router.get("/operations-pulse", response_model=LiveOperationsResponse)
async def api_get_live_operations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Get real-time operational metrics.
    
    Returns LIVE data (no date range needed):
    - **occupancy**: Table occupancy (occupied vs total, percentage)
    - **active_orders**: Orders in progress by status (OPEN, IN_PROGRESS, READY, PENDING_PAYMENT)
    - **kitchen_queue**: Number of items pending in kitchen
    - **avg_prep_minutes_today**: Average prep time for today
    - **today**: Today's sales and order count
    
    This endpoint is designed for frequent polling (every 30-60 seconds)
    to power the Operations Pulse widget in the analytics dashboard.
    """
    result = await get_live_operations(
        db=db,
        tenant_id=current_user.tenant_id
    )
    
    return result


# ============================================
# Payment / Cashier Analytics
# ============================================

@router.get("/payment-analytics", response_model=PaymentAnalyticsResponse)
async def api_get_payment_analytics(
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
    Get payment method breakdown and cashier shift analytics.
    
    Returns:
    - **payment_methods**: Breakdown by CASH, CARD, TRANSFER (count, amount, tips, %)
    - **total_revenue**: Total revenue from all payment methods
    - **total_tips**: Total tips collected
    - **tip_percentage**: Tips as % of revenue
    - **shifts**: Cash shift summary (total, avg duration, discrepancies, drops)
    
    Integrates CashShift/CashTransaction data for complete cash flow picture.
    """
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_payment_analytics(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


# ============================================
# Order Source Analytics
# ============================================

@router.get("/order-sources", response_model=OrderSourceResponse)
async def api_get_order_sources(
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
    Get order breakdown by source channel (POS, Self-Service, Delivery, Kiosk).
    
    Helps understand which ordering channels generate the most revenue.
    """
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_order_source_analytics(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result


# ============================================
# Unified Dashboard Endpoint
# ============================================

@router.get("/dashboard")
async def api_get_unified_dashboard(
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
    🚀 Unified Dashboard - Single endpoint for ALL analytics data.
    
    Returns all dashboard widgets' data in a single optimized request.
    Eliminates the need for 5+ parallel API calls from the frontend.
    
    Includes:
    - KPIs (average ticket, total sales, food cost %)
    - Sales comparison (current vs previous week)
    - Sales by category (pie chart)
    - Sales by hour (heatmap)
    - Top dishes (profitability table)
    - Kitchen performance (prep times, throughput)
    - Live operations (table occupancy, active orders)
    - Payment analytics (method breakdown, tips, shifts)
    - Order sources (POS vs self-service vs delivery)
    
    All queries are executed in parallel using asyncio.gather for maximum performance.
    """
    start_date = normalize_datetime(start_date)
    end_date = normalize_datetime(end_date)
    
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    result = await get_unified_dashboard(
        db=db,
        tenant_id=current_user.tenant_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return result
