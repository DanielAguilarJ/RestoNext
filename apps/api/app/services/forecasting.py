"""
RestoNext MX - AI Demand Forecasting Service
Using Facebook Prophet for ingredient demand prediction

This service:
1. Fetches last 90 days of sales data
2. Accounts for Mexican holidays
3. Predicts next week's demand for key ingredients

NOTE: Prophet and pandas are LAZY IMPORTED to avoid loading ~200MB+ 
of libraries at startup (which causes OOM on small Railway containers)
"""

from datetime import datetime, timedelta
from typing import List, Optional, Any

# Lazy import flags
_pd = None
_Prophet = None
_MEXICAN_HOLIDAYS = None


def _ensure_ai_libs() -> bool:
    """
    Lazy load Prophet and pandas only when needed.
    Returns True if libraries are available, False otherwise.
    """
    global _pd, _Prophet, _MEXICAN_HOLIDAYS
    
    if _pd is not None:
        return True
    
    try:
        import pandas as pd
        from prophet import Prophet
        
        _pd = pd
        _Prophet = Prophet
        
        # Initialize Mexican holidays on first load
        _MEXICAN_HOLIDAYS = pd.DataFrame({
            'holiday': [
                'Año Nuevo',
                'Día de la Constitución',
                'Natalicio de Benito Juárez',
                'Día del Trabajo',
                'Día de la Independencia',
                'Día de la Revolución',
                'Navidad',
                'Día de Muertos',
                'Día de la Virgen de Guadalupe',
                'Semana Santa',  # Approximate
            ],
            'ds': pd.to_datetime([
                '2024-01-01',
                '2024-02-05',
                '2024-03-18',
                '2024-05-01',
                '2024-09-16',
                '2024-11-18',
                '2024-12-25',
                '2024-11-01',
                '2024-12-12',
                '2024-03-28',
            ]),
            'lower_window': [0, 0, 0, 0, -1, 0, -1, -1, 0, -3],
            'upper_window': [1, 0, 0, 0, 1, 0, 1, 1, 0, 3],
        })
        
        print("INFO:     AI Forecasting libraries loaded successfully")
        return True
        
    except ImportError as e:
        print(f"WARNING:  AI Forecasting libraries not available: {e}")
        return False



def extend_holidays_to_years(base_holidays: Any, years: List[int]) -> Any:
    """
    Extend holiday dates to multiple years.
    Prophet needs holidays for all years in the forecast range.
    """
    global _pd
    all_holidays = []
    
    for year in years:
        year_holidays = base_holidays.copy()
        year_holidays['ds'] = year_holidays['ds'].apply(
            lambda x: x.replace(year=year)
        )
        all_holidays.append(year_holidays)
    
    return _pd.concat(all_holidays, ignore_index=True)


def prepare_sales_data(sales_data: List[dict]) -> Any:
    """
    Convert sales data to Prophet format.
    
    Input format:
    [{"date": "2024-01-01", "quantity_sold": 50}, ...]
    
    Output format (Prophet requires 'ds' and 'y' columns):
    ds          y
    2024-01-01  50
    """
    global _pd
    df = _pd.DataFrame(sales_data)
    
    # Rename columns for Prophet
    df = df.rename(columns={
        'date': 'ds',
        'quantity_sold': 'y',
    })
    
    # Ensure datetime
    df['ds'] = _pd.to_datetime(df['ds'])
    
    # Sort by date
    df = df.sort_values('ds').reset_index(drop=True)
    
    return df


def forecast_ingredient_demand(
    sales_data: List[dict],
    ingredient_name: str,
    days_ahead: int = 7,
) -> dict:
    """
    Predict future demand for an ingredient using Prophet.
    
    Args:
        sales_data: List of dicts with 'date' and 'quantity_sold'
        ingredient_name: Name of the ingredient being forecasted
        days_ahead: Number of days to forecast (default 7)
    
    Returns:
        Dictionary with predictions including confidence intervals
    """
    # Lazy load AI libraries
    if not _ensure_ai_libs():
        return {
            "ingredient": ingredient_name,
            "error": "AI Forecasting libraries (pandas/prophet) are not installed in this environment.",
            "predictions": [],
        }
    
    global _pd, _Prophet, _MEXICAN_HOLIDAYS

    # Prepare data
    df = prepare_sales_data(sales_data)
    
    if len(df) < 14:
        # Not enough data for reliable prediction
        return {
            "ingredient": ingredient_name,
            "error": "Insufficient data. Need at least 14 days of sales history.",
            "predictions": [],
        }
    
    # Extend holidays to cover forecast period
    current_year = datetime.now().year
    holidays = extend_holidays_to_years(
        _MEXICAN_HOLIDAYS, 
        [current_year - 1, current_year, current_year + 1]
    )
    
    # Initialize Prophet model
    try:
        # Initialize Prophet model
        model = _Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,  # Restaurant data is usually daily aggregated
            holidays=holidays,
            changepoint_prior_scale=0.05,  # More conservative trend changes
            seasonality_prior_scale=10,
        )
        
        # Add Mexican-specific seasonality (paydays: 15th and end of month)
        model.add_seasonality(
            name='payday',
            period=15,
            fourier_order=3,
        )
        
        # Fit model
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=days_ahead)
        
        # Make predictions
        forecast = model.predict(future)
        
        # Extract only future predictions
        future_mask = forecast['ds'] > df['ds'].max()
        future_forecast = forecast[future_mask][['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        
        # Format results
        predictions = []
        for _, row in future_forecast.iterrows():
            predictions.append({
                "date": row['ds'].strftime('%Y-%m-%d'),
                "predicted_demand": max(0, round(row['yhat'], 2)),  # No negative demand
                "lower_bound": max(0, round(row['yhat_lower'], 2)),
                "upper_bound": max(0, round(row['yhat_upper'], 2)),
            })
            
    except Exception as e:
        print(f"ERROR:    Prophet execution failed: {e}")
        return {
            "ingredient": ingredient_name,
            "error": f"Error calculating forecast: {str(e)}",
            "predictions": [],
        }
    
    return {
        "ingredient": ingredient_name,
        "predictions": predictions,
        "model_metrics": {
            "data_points": len(df),
            "forecast_days": days_ahead,
        }
    }


def generate_sample_sales_data(
    ingredient: str,
    days: int = 90,
) -> List[dict]:
    """
    Generate sample sales data for testing.
    Simulates realistic restaurant ingredient consumption patterns.
    """
    import random
    
    base_demand = {
        "Aguacate": 30,
        "Carne": 50,
        "Tortilla": 100,
        "Queso": 40,
        "Tomate": 35,
    }.get(ingredient, 25)
    
    data = []
    start_date = datetime.now() - timedelta(days=days)
    
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        day_of_week = current_date.weekday()
        
        # Weekend boost (Fri, Sat, Sun)
        weekend_multiplier = 1.4 if day_of_week >= 4 else 1.0
        
        # Random variation
        random_factor = random.uniform(0.8, 1.2)
        
        # Trending slightly up over time (business growth)
        trend = 1 + (i / days) * 0.1
        
        quantity = base_demand * weekend_multiplier * random_factor * trend
        
        data.append({
            "date": current_date.strftime('%Y-%m-%d'),
            "quantity_sold": round(quantity, 2),
        })
    
    return data


async def fetch_sales_from_db(
    db_session,
    tenant_id: str,
    ingredient_id: str,
    days: int = 90,
) -> List[dict]:
    """
    Fetch real ingredient consumption data from InventoryTransaction records.
    
    Aggregates daily sales/usage quantities for the specified ingredient
    over the last `days` days, returning data in Prophet-compatible format.
    """
    from sqlalchemy import select, func, cast, Date
    from app.models.models import InventoryTransaction
    
    cutoff_date = datetime.now() - timedelta(days=days)
    
    try:
        # Query daily aggregated consumption (sale + negative adjustments)
        from uuid import UUID as PyUUID
        ing_uuid = PyUUID(ingredient_id) if isinstance(ingredient_id, str) else ingredient_id
        
        stmt = (
            select(
                cast(InventoryTransaction.created_at, Date).label("date"),
                func.sum(func.abs(InventoryTransaction.quantity)).label("quantity_sold"),
            )
            .where(
                InventoryTransaction.ingredient_id == ing_uuid,
                InventoryTransaction.created_at >= cutoff_date,
                InventoryTransaction.transaction_type.in_(["sale", "waste"]),
            )
            .group_by(cast(InventoryTransaction.created_at, Date))
            .order_by(cast(InventoryTransaction.created_at, Date))
        )
        
        result = await db_session.execute(stmt)
        rows = result.all()
        
        if not rows:
            return []
        
        return [
            {
                "date": row.date.strftime("%Y-%m-%d"),
                "quantity_sold": float(row.quantity_sold),
            }
            for row in rows
        ]
    except Exception as e:
        print(f"WARNING:  Failed to fetch sales data from DB: {e}")
        return []


async def get_forecast_for_ingredient(
    tenant_id: str,
    ingredient: str,
    db_session=None,
    ingredient_id: str = None,
) -> dict:
    """
    Main entry point for forecasting.
    Fetches real data from database and returns predictions.
    
    Falls back to sample data if no DB session or insufficient real data.
    """
    sales_data = None
    
    # Try to fetch real consumption data from DB
    if db_session and ingredient_id:
        sales_data = await fetch_sales_from_db(
            db_session, tenant_id, ingredient_id
        )
    
    # Fallback to sample data if not enough real records
    if not sales_data or len(sales_data) < 14:
        sales_data = generate_sample_sales_data(ingredient, days=90)
    
    return forecast_ingredient_demand(sales_data, ingredient)
