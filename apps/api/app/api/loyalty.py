from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, Customer, LoyaltyTransaction, LoyaltyTransactionType
from app.schemas.schemas import LoyaltyTransactionResponse

router = APIRouter()

@router.get("/{customer_id}", response_model=dict)
async def get_loyalty_summary(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current points balance, wallet balance, and tier.
    """
    query = select(Customer).where(
        Customer.id == customer_id, 
        Customer.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return {
        "points": customer.loyalty_points,
        "wallet_balance": customer.wallet_balance,
        "tier": customer.tier_level
    }

@router.get("/{customer_id}/transactions", response_model=List[LoyaltyTransactionResponse])
async def get_loyalty_history(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full history of loyalty transactions.
    """
    # Verify customer ownership first
    query_cust = select(Customer).where(
        Customer.id == customer_id, 
        Customer.tenant_id == current_user.tenant_id
    )
    if not (await db.execute(query_cust)).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")

    query = select(LoyaltyTransaction)\
        .where(LoyaltyTransaction.customer_id == customer_id)\
        .order_by(desc(LoyaltyTransaction.created_at))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/transaction", response_model=LoyaltyTransactionResponse)
async def manual_loyalty_adjustment(
    customer_id: UUID = Body(...),
    points_delta: float = Body(0.0),
    amount_delta: float = Body(0.0),
    description: str = Body(...),
    type: LoyaltyTransactionType = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manual adjustment (Manager only ideally, but role check omitted for MVP).
    Use for manual point grants, corrections, or redemptions.
    """
    query = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Create transaction log
    transaction = LoyaltyTransaction(
        customer_id=customer_id,
        points_delta=points_delta,
        amount_delta=amount_delta,
        description=description,
        type=type
    )
    
    # Update customer balances
    customer.loyalty_points += points_delta
    customer.wallet_balance += amount_delta
    
    # Simple tiering logic
    if customer.loyalty_points > 1000:
        customer.tier_level = "Gold"
    elif customer.loyalty_points > 500:
        customer.tier_level = "Silver"
    else:
        customer.tier_level = "Bronze"

    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction
