"""
RestoNext MX - Cash Management Models
SQLAlchemy models for CashShift (turno) and CashTransaction (movimientos de caja)
"""

import uuid
from datetime import datetime
from typing import Optional, List
import enum

from sqlalchemy import (
    String, Float, Boolean, DateTime, ForeignKey, Text,
    Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ============================================
# Enums
# ============================================

class ShiftStatus(str, enum.Enum):
    """Status of a cash shift"""
    OPEN = "open"
    CLOSED = "closed"


class CashTransactionType(str, enum.Enum):
    """Types of cash transactions within a shift"""
    SALE = "sale"              # Payment received from order
    DROP = "drop"              # Cash withdrawal to safe (sangría)
    PAYOUT = "payout"          # Cash payment out (e.g., refund)
    ADJUSTMENT = "adjustment"  # Manual adjustment


class PaymentMethod(str, enum.Enum):
    """Payment methods accepted"""
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    OTHER = "other"


# ============================================
# CashShift Model
# ============================================

class CashShift(Base):
    """
    Represents a cashier's work shift.
    Tracks opening float, sales, drops, and closing count.
    
    Business Logic:
    - Only one OPEN shift per user at a time
    - expected_cash = opening_amount + cash_sales - drops
    - difference = real_cash - expected_cash
    """
    __tablename__ = "cash_shifts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # Optional: specific register/drawer identifier
    register_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    
    # Timestamps
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Cash amounts
    opening_amount: Mapped[float] = mapped_column(Float, default=0.0)  # Fondo fijo inicial
    
    # Calculated totals (updated during shift)
    total_sales: Mapped[float] = mapped_column(Float, default=0.0)      # All sales
    cash_sales: Mapped[float] = mapped_column(Float, default=0.0)       # Cash portion
    card_sales: Mapped[float] = mapped_column(Float, default=0.0)       # Card portion
    transfer_sales: Mapped[float] = mapped_column(Float, default=0.0)   # Transfer portion
    
    # Drops (sangrías) - total removed during shift
    total_drops: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Closing values (set when shift is closed)
    expected_cash: Mapped[float] = mapped_column(Float, default=0.0)   # Calculated
    real_cash: Mapped[float] = mapped_column(Float, default=0.0)       # Counted by cashier
    difference: Mapped[float] = mapped_column(Float, default=0.0)      # Sobrante/Faltante
    
    # JSONB for detailed bill/coin breakdown at close
    # Example: {"bills": {"1000": 2, "500": 3, ...}, "coins": {"10": 5, ...}}
    cash_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    status: Mapped[ShiftStatus] = mapped_column(
        SQLEnum(ShiftStatus), default=ShiftStatus.OPEN
    )
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    transactions: Mapped[List["CashTransaction"]] = relationship(
        back_populates="shift", cascade="all, delete-orphan"
    )
    
    def calculate_expected_cash(self) -> float:
        """Calculate expected cash: opening + cash_sales - drops"""
        return self.opening_amount + self.cash_sales - self.total_drops
    
    def close_shift(self, real_cash: float, cash_breakdown: dict = None, notes: str = None):
        """Close the shift and calculate discrepancy"""
        self.expected_cash = self.calculate_expected_cash()
        self.real_cash = real_cash
        self.difference = real_cash - self.expected_cash
        self.cash_breakdown = cash_breakdown
        self.closed_at = datetime.utcnow()
        self.status = ShiftStatus.CLOSED
        if notes:
            self.notes = notes


# ============================================
# CashTransaction Model
# ============================================

class CashTransaction(Base):
    """
    Individual cash movement within a shift.
    Tracks sales, drops, payouts, and adjustments.
    """
    __tablename__ = "cash_transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cash_shifts.id"), nullable=False
    )
    
    transaction_type: Mapped[CashTransactionType] = mapped_column(
        SQLEnum(CashTransactionType), nullable=False
    )
    
    # Amount (positive for in, negative for out in business logic,
    # but stored as absolute value with type determining direction)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Payment method (relevant for SALE type)
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        SQLEnum(PaymentMethod), nullable=True
    )
    
    # Reference to order if this is a sale
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True
    )
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    
    # Relationships
    shift: Mapped["CashShift"] = relationship(back_populates="transactions")
