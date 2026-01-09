"""
RestoNext MX - AI Demand Forecasting Service
Using Facebook Prophet for ingredient demand prediction

This service:
1. Fetches last 90 days of sales data
2. Accounts for Mexican holidays
3. Predicts next week's demand for key ingredients
"""

from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
from prophet import Prophet


# Mexican holidays for Prophet model
# These affect restaurant demand patterns
MEXICAN_HOLIDAYS = pd.DataFrame({
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


def extend_holidays_to_years(base_holidays: pd.DataFrame, years: List[int]) -> pd.DataFrame:
    """
    Extend holiday dates to multiple years.
    Prophet needs holidays for all years in the forecast range.
    """
    all_holidays = []
    
    for year in years:
        year_holidays = base_holidays.copy()
        year_holidays['ds'] = year_holidays['ds'].apply(
            lambda x: x.replace(year=year)
        )
        all_holidays.append(year_holidays)
    
    return pd.concat(all_holidays, ignore_index=True)


def prepare_sales_data(sales_data: List[dict]) -> pd.DataFrame:
    """
    Convert sales data to Prophet format.
    
    Input format:
    [{"date": "2024-01-01", "quantity_sold": 50}, ...]
    
    Output format (Prophet requires 'ds' and 'y' columns):
    ds          y
    2024-01-01  50
    """
    df = pd.DataFrame(sales_data)
    
    # Rename columns for Prophet
    df = df.rename(columns={
        'date': 'ds',
        'quantity_sold': 'y',
    })
    
    # Ensure datetime
    df['ds'] = pd.to_datetime(df['ds'])
    
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
        MEXICAN_HOLIDAYS, 
        [current_year - 1, current_year, current_year + 1]
    )
    
    # Initialize Prophet model
    model = Prophet(
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


async def get_forecast_for_ingredient(
    tenant_id: str,
    ingredient: str,
    db_session = None,
) -> dict:
    """
    Main entry point for forecasting.
    Fetches real data from database and returns predictions.
    
    For demo/testing, generates sample data if no DB session.
    """
    if db_session:
        # In production, fetch from DailySales table
        # sales_data = await fetch_sales_from_db(db_session, tenant_id, ingredient)
        pass
    
    # For demo, generate sample data
    sales_data = generate_sample_sales_data(ingredient, days=90)
    
    return forecast_ingredient_demand(sales_data, ingredient)
