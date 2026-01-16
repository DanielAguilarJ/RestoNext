"""
RestoNext MX - Cashier API Routes
Cash shift management: open, drop, close
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Order, OrderStatus
from app.models.cash_management import (
    CashShift, CashTransaction, ShiftStatus, 
    CashTransactionType, PaymentMethod
)

router = APIRouter(prefix="/shift", tags=["Cash Management"])


# ============================================
# Pydantic Schemas
# ============================================

class OpenShiftRequest(BaseModel):
    opening_amount: float = Field(..., ge=0, description="Initial cash float")
    register_id: Optional[str] = Field(None, description="Optional register/drawer ID")


class OpenShiftResponse(BaseModel):
    shift_id: str
    opened_at: datetime
    opening_amount: float
    register_id: Optional[str]
    message: str


class DropRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to withdraw")
    notes: Optional[str] = Field(None, description="Reason for drop")


class DropResponse(BaseModel):
    transaction_id: str
    amount: float
    total_drops: float
    remaining_expected: float
    message: str


class CashBreakdown(BaseModel):
    """Detailed bill/coin count"""
    bills_1000: int = Field(0, ge=0)
    bills_500: int = Field(0, ge=0)
    bills_200: int = Field(0, ge=0)
    bills_100: int = Field(0, ge=0)
    bills_50: int = Field(0, ge=0)
    bills_20: int = Field(0, ge=0)
    coins_20: int = Field(0, ge=0)
    coins_10: int = Field(0, ge=0)
    coins_5: int = Field(0, ge=0)
    coins_2: int = Field(0, ge=0)
    coins_1: int = Field(0, ge=0)
    coins_050: int = Field(0, ge=0)  # 50 centavos


class CloseShiftRequest(BaseModel):
    real_cash: float = Field(..., ge=0, description="Counted cash amount")
    cash_breakdown: Optional[CashBreakdown] = None
    notes: Optional[str] = None


class TransactionSummary(BaseModel):
    time: str
    amount: float
    notes: Optional[str]


class CloseShiftResponse(BaseModel):
    shift_id: str
    opened_at: datetime
    closed_at: datetime
    cashier: str
    register_id: Optional[str]
    
    # Financial summary
    opening_amount: float
    total_sales: float
    cash_sales: float
    card_sales: float
    transfer_sales: float
    
    # Drops
    drops: list[TransactionSummary]
    total_drops: float
    
    # Closing calculation
    expected_cash: float
    real_cash: float
    difference: float
    status: str  # "exact", "over", "short"
    
    notes: Optional[str]


class CurrentShiftResponse(BaseModel):
    shift_id: str
    opened_at: datetime
    opening_amount: float
    register_id: Optional[str]
    cash_sales: float
    card_sales: float
    total_drops: float
    expected_cash: float
    transactions_count: int


class TransactionDetail(BaseModel):
    id: str
    type: str
    amount: float
    payment_method: Optional[str]
    order_id: Optional[str]
    notes: Optional[str]
    created_at: datetime


class TransactionListResponse(BaseModel):
    transactions: list[TransactionDetail]


# ============================================
# Helper Functions
# ============================================

async def get_open_shift(
    user_id: UUID, 
    tenant_id: UUID, 
    db: AsyncSession
) -> Optional[CashShift]:
    """Get user's currently open shift"""
    result = await db.execute(
        select(CashShift).where(
            and_(
                CashShift.user_id == user_id,
                CashShift.tenant_id == tenant_id,
                CashShift.status == ShiftStatus.OPEN
            )
        )
    )
    return result.scalar_one_or_none()


# ============================================
# API Endpoints
# ============================================

@router.post("/open", response_model=OpenShiftResponse)
async def open_shift(
    request: OpenShiftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Open a new cash shift.
    Validates that no shift is currently open for this user.
    """
    # Check for existing open shift
    existing = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Shift already open since {existing.opened_at.isoformat()}"
        )
    
    # Create new shift
    shift = CashShift(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        register_id=request.register_id,
        opening_amount=request.opening_amount,
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    
    return OpenShiftResponse(
        shift_id=str(shift.id),
        opened_at=shift.opened_at,
        opening_amount=shift.opening_amount,
        register_id=shift.register_id,
        message="Shift opened successfully"
    )


@router.get("/current", response_model=CurrentShiftResponse)
async def get_current_shift(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current open shift for this user"""
    shift = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open shift found"
        )
    
    # Count transactions
    tx_result = await db.execute(
        select(CashTransaction).where(CashTransaction.shift_id == shift.id)
    )
    transactions = tx_result.scalars().all()
    
    return CurrentShiftResponse(
        shift_id=str(shift.id),
        opened_at=shift.opened_at,
        opening_amount=shift.opening_amount,
        register_id=shift.register_id,
        cash_sales=shift.cash_sales,
        card_sales=shift.card_sales,
        total_drops=shift.total_drops,
        expected_cash=shift.calculate_expected_cash(),
        transactions_count=len(transactions)
    )


@router.post("/drop", response_model=DropResponse)
async def record_drop(
    request: DropRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a cash drop (sangría) - partial withdrawal to safe.
    """
    shift = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open shift found. Please open a shift first."
        )
    
    # Create transaction
    transaction = CashTransaction(
        shift_id=shift.id,
        transaction_type=CashTransactionType.DROP,
        amount=request.amount,
        notes=request.notes,
        created_by=current_user.id,
    )
    db.add(transaction)
    
    # Update shift total
    shift.total_drops += request.amount
    
    await db.commit()
    await db.refresh(transaction)
    
    return DropResponse(
        transaction_id=str(transaction.id),
        amount=request.amount,
        total_drops=shift.total_drops,
        remaining_expected=shift.calculate_expected_cash(),
        message="Cash drop recorded successfully"
    )


@router.post("/close", response_model=CloseShiftResponse)
async def close_shift(
    request: CloseShiftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Close the current shift.
    Calculates expected vs actual cash and records discrepancy.
    """
    shift = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open shift found"
        )
    
    # Get all drop transactions for summary
    drop_result = await db.execute(
        select(CashTransaction).where(
            and_(
                CashTransaction.shift_id == shift.id,
                CashTransaction.transaction_type == CashTransactionType.DROP
            )
        )
    )
    drops = drop_result.scalars().all()
    
    # Convert cash breakdown to dict if provided
    breakdown_dict = None
    if request.cash_breakdown:
        breakdown_dict = {
            "bills": {
                "1000": request.cash_breakdown.bills_1000,
                "500": request.cash_breakdown.bills_500,
                "200": request.cash_breakdown.bills_200,
                "100": request.cash_breakdown.bills_100,
                "50": request.cash_breakdown.bills_50,
                "20": request.cash_breakdown.bills_20,
            },
            "coins": {
                "20": request.cash_breakdown.coins_20,
                "10": request.cash_breakdown.coins_10,
                "5": request.cash_breakdown.coins_5,
                "2": request.cash_breakdown.coins_2,
                "1": request.cash_breakdown.coins_1,
                "0.50": request.cash_breakdown.coins_050,
            }
        }
    
    # Close the shift
    shift.close_shift(
        real_cash=request.real_cash,
        cash_breakdown=breakdown_dict,
        notes=request.notes
    )
    
    await db.commit()
    await db.refresh(shift)
    
    # Determine status
    if shift.difference == 0:
        diff_status = "exact"
    elif shift.difference > 0:
        diff_status = "over"
    else:
        diff_status = "short"
    
    # Build drop summaries
    drop_summaries = [
        TransactionSummary(
            time=d.created_at.strftime("%H:%M"),
            amount=d.amount,
            notes=d.notes
        )
        for d in drops
    ]
    
    return CloseShiftResponse(
        shift_id=str(shift.id),
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        cashier=current_user.name,
        register_id=shift.register_id,
        opening_amount=shift.opening_amount,
        total_sales=shift.total_sales,
        cash_sales=shift.cash_sales,
        card_sales=shift.card_sales,
        transfer_sales=shift.transfer_sales,
        drops=drop_summaries,
        total_drops=shift.total_drops,
        expected_cash=shift.expected_cash,
        real_cash=shift.real_cash,
        difference=shift.difference,
        status=diff_status,
        notes=shift.notes
    )


@router.post("/record-sale")
async def record_sale(
    order_id: UUID,
    amount: float,
    payment_method: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a sale transaction in the current shift.
    Called when an order is paid.
    """
    shift = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open shift found"
        )
    
    # Map payment method
    pm = PaymentMethod.CASH
    if payment_method == "card":
        pm = PaymentMethod.CARD
    elif payment_method == "transfer":
        pm = PaymentMethod.TRANSFER
    
    # Create transaction
    transaction = CashTransaction(
        shift_id=shift.id,
        transaction_type=CashTransactionType.SALE,
        amount=amount,
        payment_method=pm,
        order_id=order_id,
        created_by=current_user.id,
    )
    db.add(transaction)
    
    # Update shift totals
    shift.total_sales += amount
    if pm == PaymentMethod.CASH:
        shift.cash_sales += amount
    elif pm == PaymentMethod.CARD:
        shift.card_sales += amount
    elif pm == PaymentMethod.TRANSFER:
        shift.transfer_sales += amount
    
    await db.commit()
    
    return {"message": "Sale recorded", "transaction_id": str(transaction.id)}


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transactions for the current open shift"""
    shift = await get_open_shift(
        current_user.id, current_user.tenant_id, db
    )
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open shift found"
        )
    
    result = await db.execute(
        select(CashTransaction)
        .where(CashTransaction.shift_id == shift.id)
        .order_by(CashTransaction.created_at.desc())
    )
    transactions = result.scalars().all()
    
    return TransactionListResponse(
        transactions=[
            TransactionDetail(
                id=str(t.id),
                type=t.transaction_type.value,
                amount=t.amount,
                payment_method=t.payment_method.value if t.payment_method else None,
                order_id=str(t.order_id) if t.order_id else None,
                notes=t.notes,
                created_at=t.created_at
            )
            for t in transactions
        ]
    )
