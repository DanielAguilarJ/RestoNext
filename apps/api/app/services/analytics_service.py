"""
RestoNext MX - Analytics Service
Business Intelligence data aggregation using PostgreSQL window functions

Integrated Modules:
- POS: Order creation, sales tracking, table occupancy
- Kitchen/KDS: Prep time analytics, station performance, bottleneck detection
- Cashier: Payment method breakdown, shift performance, tip analytics
- Billing: Invoice tracking, CFDI compliance metrics
"""

from datetime import datetime, timedelta, date
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, text, case, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Order, OrderItem, MenuItem, MenuCategory,
    Recipe, Ingredient, OrderStatus, Table, TableStatus,
    OrderItemStatus
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
    # PostgreSQL enum values are stored in lowercase to match Python model values
    # Migration a013 normalized all enum values to lowercase
    query = text("""
        SELECT 
            EXTRACT(HOUR FROM o.created_at)::int AS hour,
            EXTRACT(DOW FROM o.created_at)::int AS day_of_week,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('paid', 'delivered')
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
    # Enum values are lowercase (paid, delivered) matching Python model
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
            AND o.status IN ('paid', 'delivered')
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
                AND o.status IN ('paid', 'delivered')
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
    # Basic order aggregations - enum values are lowercase
    query = text("""
        SELECT 
            COALESCE(AVG(o.total), 0) AS average_ticket,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COUNT(o.id) AS total_orders
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('paid', 'delivered')
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
            AND o.status IN ('paid', 'delivered')
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
            AND o.status IN ('paid', 'delivered')
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
            AND o.status IN ('paid', 'delivered')
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
            AND o.status IN ('paid', 'delivered')
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


# ============================================
# Kitchen / KDS Performance Analytics
# ============================================

async def get_kitchen_performance(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Get kitchen performance metrics from order item timestamps.
    
    Calculates:
    - Average prep time (created_at to status=READY transition)
    - Items completed per hour
    - Station breakdown (kitchen vs bar)
    - Bottleneck detection (items that exceeded prep_time_minutes)
    
    Uses order_items.created_at as the start and order.updated_at when 
    status transitions to READY/DELIVERED as the end marker.
    """
    # Average prep time: time from order creation to order becoming READY or DELIVERED
    prep_time_query = text("""
        SELECT 
            COALESCE(
                AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0),
                0
            ) AS avg_prep_minutes,
            COALESCE(
                PERCENTILE_CONT(0.5) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0
                ),
                0
            ) AS median_prep_minutes,
            COALESCE(
                PERCENTILE_CONT(0.95) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0
                ),
                0
            ) AS p95_prep_minutes,
            COUNT(o.id) AS orders_completed
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('ready', 'delivered', 'paid')
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
            AND o.updated_at > o.created_at
    """)
    
    result = await db.execute(prep_time_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    row = result.fetchone()
    
    avg_prep = float(row.avg_prep_minutes) if row else 0.0
    median_prep = float(row.median_prep_minutes) if row else 0.0
    p95_prep = float(row.p95_prep_minutes) if row else 0.0
    orders_completed = row.orders_completed if row else 0
    
    # Station breakdown: items by route_to (kitchen vs bar)
    station_query = text("""
        SELECT 
            oi.route_to,
            COUNT(oi.id) AS items_count,
            COALESCE(SUM(oi.quantity), 0) AS total_quantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('ready', 'delivered', 'paid')
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY oi.route_to
    """)
    
    station_result = await db.execute(station_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    stations = {}
    for srow in station_result.fetchall():
        stations[srow.route_to] = {
            "items_count": srow.items_count,
            "total_quantity": srow.total_quantity
        }
    
    # Items per hour throughput
    hours_in_range = max(1, (end_date - start_date).total_seconds() / 3600)
    total_items = sum(s["total_quantity"] for s in stations.values())
    items_per_hour = total_items / hours_in_range
    
    # Bottleneck detection: orders where total time exceeded max prep time
    bottleneck_query = text("""
        SELECT 
            COUNT(o.id) AS slow_orders,
            COALESCE(AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0), 0) AS avg_slow_minutes
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('ready', 'delivered', 'paid')
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
            AND o.updated_at > o.created_at
            AND EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0 > 20
    """)
    
    bottleneck_result = await db.execute(bottleneck_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    bottleneck_row = bottleneck_result.fetchone()
    
    slow_orders = bottleneck_row.slow_orders if bottleneck_row else 0
    avg_slow_minutes = float(bottleneck_row.avg_slow_minutes) if bottleneck_row else 0.0
    
    return {
        "avg_prep_minutes": round(avg_prep, 1),
        "median_prep_minutes": round(median_prep, 1),
        "p95_prep_minutes": round(p95_prep, 1),
        "orders_completed": orders_completed,
        "items_per_hour": round(items_per_hour, 1),
        "station_breakdown": stations,
        "bottleneck": {
            "slow_orders": slow_orders,
            "avg_slow_minutes": round(avg_slow_minutes, 1),
            "percentage": round((slow_orders / orders_completed * 100) if orders_completed > 0 else 0, 1)
        },
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================
# Table Occupancy / Real-time Operations
# ============================================

async def get_live_operations(
    db: AsyncSession,
    tenant_id: UUID,
) -> dict:
    """
    Get real-time operational metrics for the Operations Pulse widget.
    
    Returns:
    - Table occupancy (occupied/total, percentage)
    - Active orders count by status
    - Today's live sales
    - Current kitchen queue depth
    """
    # Table occupancy
    table_query = text("""
        SELECT 
            COUNT(*) AS total_tables,
            COALESCE(SUM(CASE WHEN t.status != 'free' THEN 1 ELSE 0 END), 0) AS occupied_tables
        FROM tables t
        WHERE t.tenant_id = :tenant_id
            AND t.number > 0
    """)
    
    table_result = await db.execute(table_query, {"tenant_id": str(tenant_id)})
    table_row = table_result.fetchone()
    
    total_tables = table_row.total_tables if table_row else 0
    occupied_tables = table_row.occupied_tables if table_row else 0
    occupancy_pct = round((occupied_tables / total_tables * 100) if total_tables > 0 else 0, 1)
    
    # Active orders by status
    orders_query = text("""
        SELECT 
            o.status,
            COUNT(o.id) AS count
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('open', 'in_progress', 'ready', 'pending_payment')
        GROUP BY o.status
    """)
    
    orders_result = await db.execute(orders_query, {"tenant_id": str(tenant_id)})
    active_orders = {}
    total_active = 0
    for orow in orders_result.fetchall():
        active_orders[orow.status] = orow.count
        total_active += orow.count
    
    # Today's sales
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_query = text("""
        SELECT 
            COALESCE(SUM(o.total), 0) AS today_sales,
            COUNT(o.id) AS today_orders
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('paid', 'delivered')
            AND o.created_at >= :today_start
    """)
    
    today_result = await db.execute(today_query, {
        "tenant_id": str(tenant_id),
        "today_start": today_start
    })
    today_row = today_result.fetchone()
    today_sales = float(today_row.today_sales) if today_row else 0.0
    today_orders = today_row.today_orders if today_row else 0
    
    # Kitchen queue: pending items in active orders
    queue_query = text("""
        SELECT COUNT(oi.id) AS pending_items
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('open', 'in_progress')
            AND oi.status IN ('pending', 'preparing')
    """)
    
    queue_result = await db.execute(queue_query, {"tenant_id": str(tenant_id)})
    queue_row = queue_result.fetchone()
    kitchen_queue = queue_row.pending_items if queue_row else 0
    
    # Average prep time for today's orders
    today_prep_query = text("""
        SELECT 
            COALESCE(
                AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60.0),
                0
            ) AS avg_prep_minutes
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('ready', 'delivered', 'paid')
            AND o.created_at >= :today_start
            AND o.updated_at > o.created_at
    """)
    
    today_prep_result = await db.execute(today_prep_query, {
        "tenant_id": str(tenant_id),
        "today_start": today_start
    })
    today_prep_row = today_prep_result.fetchone()
    avg_prep_today = float(today_prep_row.avg_prep_minutes) if today_prep_row else 0.0
    
    return {
        "occupancy": {
            "total_tables": total_tables,
            "occupied_tables": occupied_tables,
            "percentage": occupancy_pct
        },
        "active_orders": active_orders,
        "total_active_orders": total_active,
        "kitchen_queue": kitchen_queue,
        "avg_prep_minutes_today": round(avg_prep_today, 1),
        "today": {
            "sales": round(today_sales, 2),
            "orders": today_orders
        }
    }


# ============================================
# Cashier / Payment Analytics
# ============================================

async def get_payment_analytics(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Get payment method breakdown and cashier shift analytics.
    
    Integrates CashShift and CashTransaction data with order data
    to provide a complete picture of cash flow.
    """
    # Payment method breakdown from cash transactions
    payment_query = text("""
        SELECT 
            ct.payment_method,
            COUNT(ct.id) AS transaction_count,
            COALESCE(SUM(ct.amount), 0) AS total_amount,
            COALESCE(SUM(ct.tip_amount), 0) AS total_tips
        FROM cash_transactions ct
        JOIN cash_shifts cs ON cs.id = ct.shift_id
        WHERE cs.tenant_id = :tenant_id
            AND ct.transaction_type = 'sale'
            AND ct.created_at >= :start_date
            AND ct.created_at <= :end_date
        GROUP BY ct.payment_method
    """)
    
    payment_result = await db.execute(payment_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    payment_methods = {}
    total_revenue = 0.0
    total_tips = 0.0
    total_transactions = 0
    
    for prow in payment_result.fetchall():
        method = prow.payment_method or "unknown"
        amount = float(prow.total_amount)
        tips = float(prow.total_tips)
        payment_methods[method] = {
            "count": prow.transaction_count,
            "amount": round(amount, 2),
            "tips": round(tips, 2)
        }
        total_revenue += amount
        total_tips += tips
        total_transactions += prow.transaction_count
    
    # Calculate percentages
    for method in payment_methods:
        pct = (payment_methods[method]["amount"] / total_revenue * 100) if total_revenue > 0 else 0
        payment_methods[method]["percentage"] = round(pct, 1)
    
    # Shift summary: total shifts, average shift duration, discrepancies
    shift_query = text("""
        SELECT 
            COUNT(cs.id) AS total_shifts,
            COALESCE(AVG(EXTRACT(EPOCH FROM (cs.closed_at - cs.opened_at)) / 3600.0), 0) AS avg_shift_hours,
            COALESCE(SUM(cs.difference), 0) AS total_discrepancy,
            COALESCE(SUM(CASE WHEN cs.difference != 0 THEN 1 ELSE 0 END), 0) AS shifts_with_discrepancy,
            COALESCE(SUM(cs.total_drops), 0) AS total_drops
        FROM cash_shifts cs
        WHERE cs.tenant_id = :tenant_id
            AND cs.status = 'closed'
            AND cs.opened_at >= :start_date
            AND cs.closed_at <= :end_date
    """)
    
    shift_result = await db.execute(shift_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    shift_row = shift_result.fetchone()
    
    return {
        "payment_methods": payment_methods,
        "total_revenue": round(total_revenue, 2),
        "total_tips": round(total_tips, 2),
        "total_transactions": total_transactions,
        "tip_percentage": round((total_tips / total_revenue * 100) if total_revenue > 0 else 0, 1),
        "shifts": {
            "total_shifts": shift_row.total_shifts if shift_row else 0,
            "avg_shift_hours": round(float(shift_row.avg_shift_hours) if shift_row else 0, 1),
            "total_discrepancy": round(float(shift_row.total_discrepancy) if shift_row else 0, 2),
            "shifts_with_discrepancy": shift_row.shifts_with_discrepancy if shift_row else 0,
            "total_drops": round(float(shift_row.total_drops) if shift_row else 0, 2)
        },
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================
# Order Source Analytics (POS vs Self-Service vs Cafeteria)
# ============================================

async def get_order_source_analytics(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Breakdown of orders by source channel.
    Shows distribution across POS, self-service, delivery, kiosk.
    """
    source_query = text("""
        SELECT 
            o.order_source,
            COUNT(o.id) AS order_count,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COALESCE(AVG(o.total), 0) AS avg_ticket
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('paid', 'delivered')
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY o.order_source
        ORDER BY total_sales DESC
    """)
    
    result = await db.execute(source_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    sources = []
    grand_total = 0.0
    for srow in result.fetchall():
        sales = float(srow.total_sales)
        grand_total += sales
        sources.append({
            "source": srow.order_source,
            "order_count": srow.order_count,
            "total_sales": round(sales, 2),
            "avg_ticket": round(float(srow.avg_ticket), 2)
        })
    
    # Add percentages
    for s in sources:
        s["percentage"] = round((s["total_sales"] / grand_total * 100) if grand_total > 0 else 0, 1)
    
    return {
        "sources": sources,
        "total_sales": round(grand_total, 2),
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================
# Service Type Analytics (Dine-in vs Delivery vs Takeaway)
# ============================================

async def get_service_type_analytics(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Breakdown of orders by service type.
    Shows distribution across dine-in, delivery, take-away, drive-thru.
    """
    service_query = text("""
        SELECT 
            o.service_type,
            COUNT(o.id) AS order_count,
            COALESCE(SUM(o.total), 0) AS total_sales,
            COALESCE(AVG(o.total), 0) AS avg_ticket
        FROM orders o
        WHERE o.tenant_id = :tenant_id
            AND o.status IN ('paid', 'delivered')
            AND o.created_at >= :start_date
            AND o.created_at <= :end_date
        GROUP BY o.service_type
        ORDER BY total_sales DESC
    """)
    
    result = await db.execute(service_query, {
        "tenant_id": str(tenant_id),
        "start_date": start_date,
        "end_date": end_date
    })
    
    services = []
    grand_total = 0.0
    for srow in result.fetchall():
        sales = float(srow.total_sales)
        grand_total += sales
        services.append({
            "service_type": srow.service_type,
            "order_count": srow.order_count,
            "total_sales": round(sales, 2),
            "avg_ticket": round(float(srow.avg_ticket), 2)
        })
    
    for s in services:
        s["percentage"] = round((s["total_sales"] / grand_total * 100) if grand_total > 0 else 0, 1)
    
    return {
        "services": services,
        "total_sales": round(grand_total, 2),
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================
# Unified Dashboard Endpoint Data
# ============================================

async def get_unified_dashboard(
    db: AsyncSession,
    tenant_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> dict:
    """
    Single optimized query to get all dashboard data at once.
    Reduces N+1 API calls from the frontend to a single request.
    
    Returns all analytics data needed by the dashboard in one response.
    """
    # Execute all queries in parallel using asyncio.gather
    import asyncio
    
    kpis_task = get_kpis(db, tenant_id, start_date, end_date)
    comparison_task = get_sales_comparison(db, tenant_id)
    categories_task = get_sales_by_category(db, tenant_id, start_date, end_date)
    hourly_task = get_sales_by_hour(db, tenant_id, start_date, end_date)
    top_dishes_task = get_top_profitable_dishes(db, tenant_id, start_date, end_date, 10)
    kitchen_task = get_kitchen_performance(db, tenant_id, start_date, end_date)
    live_ops_task = get_live_operations(db, tenant_id)
    payments_task = get_payment_analytics(db, tenant_id, start_date, end_date)
    sources_task = get_order_source_analytics(db, tenant_id, start_date, end_date)
    
    (
        kpis, comparison, categories, hourly, top_dishes,
        kitchen, live_ops, payments, sources
    ) = await asyncio.gather(
        kpis_task, comparison_task, categories_task, hourly_task, top_dishes_task,
        kitchen_task, live_ops_task, payments_task, sources_task
    )
    
    return {
        "kpis": kpis,
        "sales_comparison": comparison,
        "sales_by_category": categories,
        "sales_by_hour": hourly,
        "top_dishes": top_dishes,
        "kitchen_performance": kitchen,
        "live_operations": live_ops,
        "payment_analytics": payments,
        "order_sources": sources,
        "generated_at": datetime.utcnow().isoformat()
    }
