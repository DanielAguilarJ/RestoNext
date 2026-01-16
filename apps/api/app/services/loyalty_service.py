
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.models import (
    Customer, LoyaltyTransaction, LoyaltyTransactionType, LoyaltyTier, Order
)

class LoyaltyService:
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    def calculate_earning_rate(self, tier: LoyaltyTier) -> float:
        """
        Returns points earned per currency unit.
        Base: 1 point per unit (assumed standard)
        Gold: +10% 
        Platinum: +20%
        """
        base_rate = 1.0
        if tier == LoyaltyTier.GOLD:
            return base_rate * 1.10
        elif tier == LoyaltyTier.PLATINUM:
            return base_rate * 1.20
        return base_rate

    async def add_points_from_order(self, customer_id: UUID, order_id: UUID, amount: float):
        """
        Calculates and adds points for a completed order.
        """
        customer = await self._get_customer(customer_id)
        if not customer:
            return

        points = amount * self.calculate_earning_rate(customer.tier_level)
        
        # Create Transaction
        # Points valid for 1 year (example rule)
        expires_at = datetime.utcnow() + timedelta(days=365)
        
        trx = LoyaltyTransaction(
            customer_id=customer_id,
            order_id=order_id,
            type=LoyaltyTransactionType.EARN,
            points_delta=points,
            amount_delta=0, # This is wallet balance delta (cashback), assuming points system here
            description=f"Points earned from Order {order_id}",
            expires_at=expires_at
        )
        self.db.add(trx)
        
        # Update Customer
        customer.loyalty_points += points
        customer.annual_spend += amount
        
        # Check for Tier Upgrade
        await self.recalculate_tier(customer)
        
        await self.db.flush()
        return trx

    async def recalculate_tier(self, customer: Customer):
        """
        Recalculate logic based on annual spend.
        Base: < 10,000
        Gold: > 10,000
        Platinum: > 50,000
        """
        # Ideally calculate strictly from last 365 days orders, but we use accumulated annual_spend for MVP speed
        spend = customer.annual_spend
        
        new_tier = LoyaltyTier.BASE
        if spend >= 50000:
            new_tier = LoyaltyTier.PLATINUM
        elif spend >= 10000:
            new_tier = LoyaltyTier.GOLD
            
        if new_tier != customer.tier_level:
            customer.tier_level = new_tier
            # Log tier change could be another transaction or system log
            
    async def process_expired_points(self):
        """
        Run this via cron daily.
        Finds EARN transactions that expired and haven't been processed.
        Deducts those points from current balance.
        """
        now = datetime.utcnow()
        
        # Find expired transactions that contributed points
        q = select(LoyaltyTransaction).where(
            LoyaltyTransaction.type == LoyaltyTransactionType.EARN,
            LoyaltyTransaction.expires_at < now,
            LoyaltyTransaction.processed_for_expiry == False,
            LoyaltyTransaction.customer.has(Customer.tenant_id == self.tenant_id)
        )
        
        result = await self.db.execute(q)
        expired_trxs = result.scalars().all()
        
        for trx in expired_trxs:
            # We need to see if these points were already "spent".
            # This is complex (FIFO). For MVP, we'll just deduct them 
            # and if balance goes negative, it goes negative (or stays 0).
            # A better FIFO system is needed for strict accounting.
            # Simplified: Deduct key amount.
            
            deduction = trx.points_delta
            
            # Create expiration transaction
            exp_trx = LoyaltyTransaction(
                customer_id=trx.customer_id,
                type=LoyaltyTransactionType.EXPIRED,
                points_delta=-deduction,
                description=f"Expired points from {trx.created_at.date()}",
                processed_for_expiry=True 
            )
            self.db.add(exp_trx)
            
            # Update customer
            # Fetch customer again to be safe if not loaded
            if trx.customer:
                 # Adjust, but don't go below zero if strict? 
                 # Let's simple math it.
                 trx.customer.loyalty_points -= deduction
                 if trx.customer.loyalty_points < 0:
                     trx.customer.loyalty_points = 0
            
            trx.processed_for_expiry = True

        await self.db.commit()

    async def _get_customer(self, customer_id: UUID) -> Optional[Customer]:
        q = select(Customer).where(
            Customer.id == customer_id, 
            Customer.tenant_id == self.tenant_id
        )
        result = await self.db.execute(q)
        return result.scalar_one_or_none()
