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


# ============================================
# Kitchen / KDS Performance Analytics
# ============================================

class StationBreakdown(BaseModel):
    """Items processed per kitchen station"""
    items_count: int = Field(..., description="Number of distinct items")
    total_quantity: int = Field(..., description="Total quantity prepared")


class BottleneckInfo(BaseModel):
    """Bottleneck detection data"""
    slow_orders: int = Field(..., description="Orders exceeding 20min prep time")
    avg_slow_minutes: float = Field(..., description="Average time for slow orders")
    percentage: float = Field(..., description="Percentage of slow orders")


class KitchenPerformanceResponse(BaseModel):
    """Kitchen/KDS performance metrics"""
    avg_prep_minutes: float = Field(..., description="Average preparation time in minutes")
    median_prep_minutes: float = Field(..., description="Median preparation time")
    p95_prep_minutes: float = Field(..., description="95th percentile prep time")
    orders_completed: int = Field(..., description="Total orders completed in period")
    items_per_hour: float = Field(..., description="Throughput: items processed per hour")
    station_breakdown: dict = Field(default_factory=dict, description="Items per station (kitchen/bar)")
    bottleneck: BottleneckInfo
    start_date: datetime
    end_date: datetime


# ============================================
# Real-time Operations Pulse
# ============================================

class OccupancyData(BaseModel):
    """Table occupancy status"""
    total_tables: int = Field(..., description="Total number of tables")
    occupied_tables: int = Field(..., description="Currently occupied tables")
    percentage: float = Field(..., description="Occupancy percentage")


class TodaySalesData(BaseModel):
    """Today's sales summary"""
    sales: float = Field(..., description="Today's total sales in MXN")
    orders: int = Field(..., description="Today's total orders")


class LiveOperationsResponse(BaseModel):
    """Real-time operational metrics"""
    occupancy: OccupancyData
    active_orders: dict = Field(default_factory=dict, description="Active orders by status")
    total_active_orders: int = Field(..., description="Total active orders")
    kitchen_queue: int = Field(..., description="Items pending in kitchen")
    avg_prep_minutes_today: float = Field(..., description="Average prep time today")
    today: TodaySalesData


# ============================================
# Payment / Cashier Analytics
# ============================================

class PaymentMethodData(BaseModel):
    """Single payment method breakdown"""
    count: int = Field(..., description="Number of transactions")
    amount: float = Field(..., description="Total amount in MXN")
    tips: float = Field(..., description="Total tips in MXN")
    percentage: float = Field(..., description="Percentage of total revenue")


class ShiftSummaryData(BaseModel):
    """Cash shift summary"""
    total_shifts: int = Field(..., description="Number of shifts in period")
    avg_shift_hours: float = Field(..., description="Average shift duration in hours")
    total_discrepancy: float = Field(..., description="Total cash discrepancy in MXN")
    shifts_with_discrepancy: int = Field(..., description="Shifts with non-zero discrepancy")
    total_drops: float = Field(..., description="Total cash drops in MXN")


class PaymentAnalyticsResponse(BaseModel):
    """Payment method breakdown and cashier analytics"""
    payment_methods: dict = Field(default_factory=dict, description="Breakdown by payment method")
    total_revenue: float = Field(..., description="Total revenue in MXN")
    total_tips: float = Field(..., description="Total tips in MXN")
    total_transactions: int = Field(..., description="Total transaction count")
    tip_percentage: float = Field(..., description="Tips as percentage of revenue")
    shifts: ShiftSummaryData
    start_date: datetime
    end_date: datetime


# ============================================
# Order Source Analytics
# ============================================

class OrderSourceData(BaseModel):
    """Sales breakdown by order source"""
    source: Optional[str] = Field(None, description="Order source (POS, SELF_SERVICE, etc)")
    order_count: int
    total_sales: float
    avg_ticket: float
    percentage: float


class OrderSourceResponse(BaseModel):
    """Response for order source analytics"""
    sources: List[OrderSourceData]
    total_sales: float
    start_date: datetime
    end_date: datetime


# ============================================
# Service Type Analytics
# ============================================

class ServiceTypeData(BaseModel):
    """Sales breakdown by service type"""
    service_type: Optional[str] = Field(None, description="Service type (DINE_IN, DELIVERY, etc)")
    order_count: int
    total_sales: float
    avg_ticket: float
    percentage: float


class ServiceTypeResponse(BaseModel):
    """Response for service type analytics"""
    services: List[ServiceTypeData]
    total_sales: float
    start_date: datetime
    end_date: datetime


# ============================================
# Unified Dashboard (Full)
# ============================================

class UnifiedDashboardResponse(BaseModel):
    """
    Complete unified dashboard response.
    Single endpoint that returns ALL analytics data.
    Eliminates multiple parallel API calls from frontend.
    """
    kpis: KPIResponse
    sales_comparison: dict = Field(default_factory=dict)
    sales_by_category: dict = Field(default_factory=dict)
    sales_by_hour: dict = Field(default_factory=dict)
    top_dishes: dict = Field(default_factory=dict)
    kitchen_performance: KitchenPerformanceResponse
    live_operations: LiveOperationsResponse
    payment_analytics: PaymentAnalyticsResponse
    order_sources: OrderSourceResponse
    generated_at: str = Field(..., description="ISO timestamp of when data was generated")
