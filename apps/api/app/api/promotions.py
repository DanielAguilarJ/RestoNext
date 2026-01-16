from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Promotion, Order
from app.schemas.schemas import PromotionCreate, PromotionResponse

router = APIRouter()

@router.get("/active", response_model=List[PromotionResponse])
async def list_active_promotions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all promotions currently active based on dates.
    """
    now = datetime.utcnow()
    query = select(Promotion).where(
        Promotion.tenant_id == current_user.tenant_id,
        Promotion.is_active == True,
        # Determine strict date range check if dates are provided
        # Or simplistic check
    )
    result = await db.execute(query)
    all_promos = result.scalars().all()
    
    # Filter in memory for simplicity or refine SQL
    active = []
    for p in all_promos:
        if p.start_date and p.start_date > now:
            continue
        if p.end_date and p.end_date < now:
            continue
        active.append(p)
        
    return active

@router.post("/", response_model=PromotionResponse)
async def create_promotion(
    promo: PromotionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_promo = Promotion(
        tenant_id=current_user.tenant_id,
        name=promo.name,
        description=promo.description,
        rules=promo.rules.dict(),
        effect=promo.effect.dict(),
        start_date=promo.start_date,
        end_date=promo.end_date
    )
    db.add(new_promo)
    await db.commit()
    await db.refresh(new_promo)
    return new_promo

@router.post("/validate-cart")
async def validate_cart_promotions(
    cart_items: List[dict] = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Complex logic to check if current cart meets any promotion rules.
    Returns list of applicable promotions and calculated discount.
    """
    # This is a stub for the complex engine.
    # In a real impl, we'd iterate over active promos, match rules (day of week, items in cart),
    # and return the best offer.
    
    return {
        "applied_promotions": [],
        "total_discount": 0.0,
        "message": "No active promotions for this cart."
    }
