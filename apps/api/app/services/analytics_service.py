"""
RestoNext MX - Analytics Service
Business Intelligence data aggregation using PostgreSQL window functions
"""

from datetime import datetime, timedelta, date
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func, text, case, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Order, OrderItem, MenuItem, MenuCategory,
    Recipe, Ingredient, OrderStatus
)


# Spanish day names for display
DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

# Chart colors for categories
CATEGORY_COLORS = [
    "#8B5CF6",  # Purple
    "#06B6D4",  # Cyan
    "#10B981",  # Emerald
    "#F59E0B",  # Amber
    "#EF4444",  # Red
    "#EC4899",  # Pink
    "#3B82F6",  # Blue
    "#84CC16",  # Lime
    "#F97316",  # Orange
    "#6366F1",  # Indigo
]


async def get_sales_by_hour(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Get sales aggregated by hour and day of week for heatmap visualization.
    
    Uses PostgreSQL EXTRACT functions for hour and day of week grouping.
    Returns data suitable for a 7-day (rows) x 24-hour (columns) heatmap.
    """
    # Query using PostgreSQL EXTRACT for hour and day of week
    query = text("""
        SELECT 
            EXTRACT(HOUR FROM o.created_at)::int AS hour,
            EXTRACT(DOW FROM o.created_at)::int AS day_of_week,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY 
            EXTRACT(HOUR FROM o.created_at),
            EXTRACT(DOW FROM o.created_at)
        ORDER BY day_of_week, hour
    """)
    
    result = await db.execute(query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    rows = result.fetchall()
    
    # Transform to structured data
    data = []
    max_sales = 0.0
    
    for row in rows:
        sales = float(row.total_sales)
        if sales > max_sales:
            max_sales = sales
            
        data.append({
            "hour": row.hour,
            "day_of_week": row.day_of_week,
            "day_name": DAY_NAMES[row.day_of_week],
            "total_sales": sales,
            "order_count": row.order_count
        })
    
    return {
        "data": data,
        "max_sales": max_sales,
        "start_date": start_date,
        "end_date": end_date
    }


async def get_top_profitable_dishes(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime,
    limit: int = 10
) -> dict:
    """
    Get top dishes ranked by profitability (Revenue - Ingredient Cost).
    
    Joins: OrderItem -> MenuItem -> Recipe -> Ingredient
    Calculates profit margin as percentage.
    """
    # First, get revenue per menu item
    revenue_query = text("""
        SELECT 
            mi.id AS menu_item_id,
            mi.name AS name,
            mc.name AS category_name,
            COUNT(oi.id) AS sales_count,
            SUM(oi.unit_price * oi.quantity) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        JOIN menu_categories mc ON mc.id = mi.category_id
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY mi.id, mi.name, mc.name
        ORDER BY revenue DESC
    """)
    
    result = await db.execute(revenue_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    revenue_rows = result.fetchall()
    
    # Calculate cost for each menu item based on recipes
    dishes = []
    
    for row in revenue_rows[:limit]:
        menu_item_id = row.menu_item_id
        
        # Get ingredient cost from recipes
        cost_query = text("""
            SELECT COALESCE(SUM(r.quantity * i.cost_per_unit), 0) AS unit_cost
            FROM recipes r
            JOIN ingredients i ON i.id = r.ingredient_id
            WHERE r.menu_item_id = :menu_item_id
        """)
        
        cost_result = await db.execute(cost_query, {"menu_item_id": str(menu_item_id)})
        cost_row = cost_result.fetchone()
        unit_cost = float(cost_row.unit_cost) if cost_row else 0.0
        
        revenue = float(row.revenue)
        total_cost = unit_cost * row.sales_count
        profit = revenue - total_cost
        profit_margin = (profit / revenue * 100) if revenue > 0 else 0.0
        
        dishes.append({
            "id": str(menu_item_id),
            "name": row.name,
            "category_name": row.category_name,
            "sales_count": row.sales_count,
            "revenue": round(revenue, 2),
            "cost": round(total_cost, 2),
            "profit": round(profit, 2),
            "profit_margin": round(profit_margin, 1)
        })
    
    # Sort by profit descending
    dishes.sort(key=lambda x: x["profit"], reverse=True)
    
    return {
        "dishes": dishes[:limit],
        "start_date": start_date,
        "end_date": end_date
    }


async def get_sales_comparison(
    db: AsyncSession,
    tenant_id: UUID
) -> dict:
    """
    Compare current week's sales with previous week.
    
    Returns daily sales for both weeks for line chart overlay.
    """
    # Calculate week boundaries
    today = datetime.now().date()
    # Start of current week (Monday)
    current_week_start = today - timedelta(days=today.weekday())
    current_week_end = current_week_start + timedelta(days=6)
    
    # Previous week
    previous_week_start = current_week_start - timedelta(days=7)
    previous_week_end = current_week_start - timedelta(days=1)
    
    async def get_weekly_data(start: date, end: date) -> Tuple[List[dict], float]:
        query = text("""
            SELECT 
                DATE(o.created_at) AS sale_date,
                EXTRACT(DOW FROM o.created_at)::int AS day_of_week,
                COALESCE(SUM(o.total), 0) AS total_sales,
                COUNT(o.id) AS order_count
            FROM orders o
            WHERE o.tenant_id = :tenant_id
                AND o.status = 'paid'
                AND DATE(o.created_at) >= :start_date
                AND DATE(o.created_at) <= :end_date
            GROUP BY DATE(o.created_at), EXTRACT(DOW FROM o.created_at)
            ORDER BY sale_date
        """)
        
        result = await db.execute(query, {
            "tenant_id": str(tenant_id),
            "start_date": start,
            "end_date": end
        })
        
        rows = result.fetchall()
        total = 0.0
        data = []
        
        for row in rows:
            sales = float(row.total_sales)
            total += sales
            data.append({
                "date": row.sale_date,
                "day_name": DAY_NAMES[row.day_of_week],
                "total_sales": round(sales, 2),
                "order_count": row.order_count
            })
        
        return data, total
    
    current_data, current_total = await get_weekly_data(current_week_start, current_week_end)
    previous_data, previous_total = await get_weekly_data(previous_week_start, previous_week_end)
    
    # Calculate change percentage
    if previous_total > 0:
        change_percentage = ((current_total - previous_total) / previous_total) * 100
    else:
        change_percentage = 100.0 if current_total > 0 else 0.0
    
    return {
        "current_week": current_data,
        "previous_week": previous_data,
        "current_week_total": round(current_total, 2),
        "previous_week_total": round(previous_total, 2),
        "change_percentage": round(change_percentage, 1),
        "current_week_start": current_week_start,
        "current_week_end": current_week_end,
        "previous_week_start": previous_week_start,
        "previous_week_end": previous_week_end
    }


async def get_kpis(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Calculate Key Performance Indicators for dashboard cards.
    
    KPIs:
    - Average ticket (order total)
    - Total sales
    - Total orders
    - Food cost percentage (COGS / Revenue)
    - Average orders per day
    - Busiest hour and day
    """
    # Basic order aggregations
    query = text("""
        SELECT 
            COALESCE(AVG(o.total), 0) AS average_ticket,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COUNT(o.id) AS total_orders
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
    """)
    
    result = await db.execute(query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    row = result.fetchone()
    average_ticket = float(row.average_ticket)
    total_sales = float(row.total_sales)
    total_orders = row.total_orders
    
    # Calculate food cost (sum of recipe ingredient costs for all sold items)
    food_cost_query = text("""
        SELECT COALESCE(SUM(
            oi.quantity * (
                SELECT COALESCE(SUM(r.quantity * i.cost_per_unit), 0)
                FROM recipes r
                JOIN ingredients i ON i.id = r.ingredient_id
                WHERE r.menu_item_id = oi.menu_item_id
            )
        ), 0) AS total_food_cost
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
    """)
    
    cost_result = await db.execute(food_cost_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    cost_row = cost_result.fetchone()
    total_food_cost = float(cost_row.total_food_cost) if cost_row else 0.0
    
    food_cost_percentage = (total_food_cost / total_sales * 100) if total_sales > 0 else 0.0
    
    # Calculate days in range for average
    days_in_range = max(1, (end_date - start_date).days + 1)
    average_orders_per_day = total_orders / days_in_range
    
    # Find busiest hour
    busiest_hour_query = text("""
        SELECT 
            EXTRACT(HOUR FROM o.created_at)::int AS hour,
            COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY EXTRACT(HOUR FROM o.created_at)
        ORDER BY order_count DESC
        LIMIT 1
    """)
    
    hour_result = await db.execute(busiest_hour_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    hour_row = hour_result.fetchone()
    busiest_hour = hour_row.hour if hour_row else None
    
    # Find busiest day
    busiest_day_query = text("""
        SELECT 
            EXTRACT(DOW FROM o.created_at)::int AS day_of_week,
            COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY EXTRACT(DOW FROM o.created_at)
        ORDER BY order_count DESC
        LIMIT 1
    """)
    
    day_result = await db.execute(busiest_day_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    day_row = day_result.fetchone()
    busiest_day = DAY_NAMES[day_row.day_of_week] if day_row else None
    
    return {
        "average_ticket": round(average_ticket, 2),
        "total_sales": round(total_sales, 2),
        "total_orders": total_orders,
        "food_cost_percentage": round(food_cost_percentage, 1),
        "average_orders_per_day": round(average_orders_per_day, 1),
        "busiest_hour": busiest_hour,
        "busiest_day": busiest_day,
        "start_date": start_date,
        "end_date": end_date
    }


async def get_sales_by_category(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Get sales distribution by menu category for pie chart.
    
    Returns percentage breakdown of sales by category.
    """
    query = text("""
        SELECT 
            mc.id AS category_id,
            mc.name AS category_name,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total_sales,
            COUNT(oi.id) AS order_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        JOIN menu_categories mc ON mc.id = mi.category_id
        WHERE o.tenant_id = :tenant_id
            AND o.status = 'paid'
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY mc.id, mc.name
        ORDER BY total_sales DESC
    """)
    
    result = await db.execute(query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    rows = result.fetchall()
    
    # Calculate total for percentages
    grand_total = sum(float(row.total_sales) for row in rows)
    
    categories = []
    for idx, row in enumerate(rows):
        sales = float(row.total_sales)
        percentage = (sales / grand_total * 100) if grand_total > 0 else 0.0
        
        categories.append({
            "category_id": str(row.category_id),
            "category_name": row.category_name,
            "total_sales": round(sales, 2),
            "order_count": row.order_count,
            "percentage": round(percentage, 1),
            "color": CATEGORY_COLORS[idx % len(CATEGORY_COLORS)]
        })
    
    return {
        "categories": categories,
        "total_sales": round(grand_total, 2),
        "start_date": start_date,
        "end_date": end_date
    }
