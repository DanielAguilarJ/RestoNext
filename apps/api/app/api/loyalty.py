
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Customer, LoyaltyTransaction, LoyaltyTransactionType, LoyaltyTier
from app.schemas.schemas import LoyaltyTransactionResponse
from app.services.loyalty_service import LoyaltyService

router = APIRouter(prefix="/loyalty", tags=["Loyalty"])

def get_loyalty_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> LoyaltyService:
    return LoyaltyService(db, current_user.tenant_id)

@router.get("/{customer_id}", response_model=dict)
async def get_loyalty_summary(
    customer_id: UUID,
    service: LoyaltyService = Depends(get_loyalty_service)
):
    """
    Get current points balance, wallet balance, tier, and earning rate.
    """
    customer = await service._get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return {
        "points": customer.loyalty_points,
        "wallet_balance": customer.wallet_balance,
        "tier": customer.tier_level,
        "annual_spend": customer.annual_spend,
        "earning_rate": service.calculate_earning_rate(customer.tier_level)
    }

@router.get("/{customer_id}/transactions", response_model=List[LoyaltyTransactionResponse])
async def get_loyalty_history(
    customer_id: UUID,
    service: LoyaltyService = Depends(get_loyalty_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full history of loyalty transactions.
    """
    # Verify customer ownership
    if not await service._get_customer(customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")

    query = select(LoyaltyTransaction)\
        .where(LoyaltyTransaction.customer_id == customer_id)\
        .order_by(desc(LoyaltyTransaction.created_at))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/process-expiration", status_code=status.HTTP_200_OK)
async def process_expiration(
    service: LoyaltyService = Depends(get_loyalty_service)
):
    """
    Trigger expiration process for old points.
    Should be called by a cron job (protected by admin in real world).
    """
    await service.process_expired_points()
    return {"message": "Expiration process completed"}

# Kept for backward compatibility/manual testing
@router.post("/transaction", response_model=LoyaltyTransactionResponse)
async def manual_loyalty_adjustment(
    customer_id: UUID = Body(...),
    points_delta: float = Body(0.0),
    amount_delta: float = Body(0.0),
    description: str = Body(...),
    type: LoyaltyTransactionType = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manual adjustment.
    """
    svc = LoyaltyService(db, current_user.tenant_id)
    customer = await svc._get_customer(customer_id)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    transaction = LoyaltyTransaction(
        customer_id=customer_id,
        points_delta=points_delta,
        amount_delta=amount_delta,
        description=description,
        type=type
    )
    
    customer.loyalty_points += points_delta
    customer.wallet_balance += amount_delta
    
    # Check tier upgrade if positive points or spend (simplified)
    if points_delta > 0:
        await svc.recalculate_tier(customer)

    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction
