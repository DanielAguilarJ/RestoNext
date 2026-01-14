"""
RestoNext MX - Analytics Schemas
Pydantic models for Business Intelligence endpoints
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================
# Sales by Hour (Heatmap)
# ============================================

class HourlySalesData(BaseModel):
    """Single cell in the sales heatmap"""
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Sunday, 6=Saturday)")
    day_name: str = Field(..., description="Day name in Spanish")
    total_sales: float = Field(..., description="Total sales in MXN")
    order_count: int = Field(..., description="Number of orders")


class SalesByHourResponse(BaseModel):
    """Response for sales by hour endpoint"""
    data: List[HourlySalesData]
    max_sales: float = Field(..., description="Maximum sales value for scaling")
    start_date: datetime
    end_date: datetime


# ============================================
# Top Profitable Dishes
# ============================================

class TopDishData(BaseModel):
    """Single dish profitability data"""
    id: str
    name: str
    category_name: str
    sales_count: int = Field(..., description="Units sold")
    revenue: float = Field(..., description="Total revenue in MXN")
    cost: float = Field(..., description="Total ingredient cost in MXN")
    profit: float = Field(..., description="Profit = Revenue - Cost")
    profit_margin: float = Field(..., description="Profit margin percentage")


class TopDishesResponse(BaseModel):
    """Response for top dishes endpoint"""
    dishes: List[TopDishData]
    start_date: datetime
    end_date: datetime


# ============================================
# Sales Comparison (Week vs Week)
# ============================================

class DailySalesPoint(BaseModel):
    """Single day's sales data for trend line"""
    date: date
    day_name: str
    total_sales: float
    order_count: int


class SalesComparisonResponse(BaseModel):
    """Response for sales comparison endpoint"""
    current_week: List[DailySalesPoint]
    previous_week: List[DailySalesPoint]
    current_week_total: float
    previous_week_total: float
    change_percentage: float = Field(..., description="Percentage change vs previous week")
    current_week_start: date
    current_week_end: date
    previous_week_start: date
    previous_week_end: date


# ============================================
# KPI Dashboard
# ============================================

class KPIResponse(BaseModel):
    """Key Performance Indicators for dashboard cards"""
    average_ticket: float = Field(..., description="Average order total in MXN")
    total_sales: float = Field(..., description="Total sales in MXN")
    total_orders: int = Field(..., description="Number of completed orders")
    food_cost_percentage: float = Field(
        ..., 
        description="Food cost as percentage of revenue (COGS/Revenue * 100)"
    )
    # Additional metrics
    average_orders_per_day: float = Field(..., description="Average orders per day")
    busiest_hour: Optional[int] = Field(None, description="Hour with most orders (0-23)")
    busiest_day: Optional[str] = Field(None, description="Day with most orders")
    start_date: datetime
    end_date: datetime


# ============================================
# Sales by Category (Pie Chart)
# ============================================

class CategorySalesData(BaseModel):
    """Single category sales data for pie chart"""
    category_id: str
    category_name: str
    total_sales: float = Field(..., description="Total sales in MXN")
    order_count: int = Field(..., description="Number of items sold")
    percentage: float = Field(..., description="Percentage of total sales")
    color: Optional[str] = Field(None, description="Suggested color for chart")


class SalesByCategoryResponse(BaseModel):
    """Response for sales by category endpoint"""
    categories: List[CategorySalesData]
    total_sales: float
    start_date: datetime
    end_date: datetime


# ============================================
# Combined Dashboard Response
# ============================================

class DashboardResponse(BaseModel):
    """Complete dashboard data in single request (optional optimization)"""
    kpis: KPIResponse
    sales_by_category: SalesByCategoryResponse
    sales_comparison: SalesComparisonResponse
    top_dishes: TopDishesResponse
    sales_by_hour: SalesByHourResponse
