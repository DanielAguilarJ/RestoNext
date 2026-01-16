"""
RestoNext MX - APScheduler Business Automation
===============================================
Automated background tasks for production SaaS operations.

Tasks:
1. daily_close_job - Close/flag stale orders at 4 AM
2. inventory_snapshot_job - Daily inventory snapshot for historical tracking
3. expire_loyalty_points - Process expired loyalty points

Schedule: All tasks run at 4:00 AM Mexico City time
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import async_session_maker
from app.models.models import (
    Order, OrderStatus, OrderItem, Tenant,
    Customer, LoyaltyTransaction, LoyaltyTransactionType,
    Ingredient, InventoryTransaction, TransactionType, UnitOfMeasure
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

settings = get_settings()

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


# ============================================
# Scheduler Initialization
# ============================================

def create_scheduler() -> AsyncIOScheduler:
    """
    Create and configure the APScheduler instance.
    Uses AsyncIOScheduler for compatibility with FastAPI's event loop.
    """
    return AsyncIOScheduler(
        timezone="America/Mexico_City",
        job_defaults={
            "coalesce": True,  # Combine missed runs into one
            "max_instances": 1,  # Only one instance of each job at a time
            "misfire_grace_time": 3600,  # 1 hour grace period for missed jobs
        }
    )


def init_scheduler() -> AsyncIOScheduler:
    """
    Initialize the scheduler and register all jobs.
    Called during application startup.
    """
    global scheduler
    
    scheduler = create_scheduler()
    
    # ============================================
    # Register Jobs - All run at 4:00 AM Mexico City
    # ============================================
    
    # 1. Daily Order Closure - 4:00 AM
    scheduler.add_job(
        daily_close_job,
        trigger=CronTrigger(hour=4, minute=0, timezone="America/Mexico_City"),
        id="daily_close_job",
        name="Daily Order Closure",
        replace_existing=True,
    )
    
    # 2. Inventory Snapshot - 4:05 AM (slight offset to avoid conflicts)
    scheduler.add_job(
        inventory_snapshot_job,
        trigger=CronTrigger(hour=4, minute=5, timezone="America/Mexico_City"),
        id="inventory_snapshot_job",
        name="Daily Inventory Snapshot",
        replace_existing=True,
    )
    
    # 3. Loyalty Points Expiration - 4:10 AM
    scheduler.add_job(
        expire_loyalty_points_job,
        trigger=CronTrigger(hour=4, minute=10, timezone="America/Mexico_City"),
        id="expire_loyalty_points_job",
        name="Loyalty Points Expiration",
        replace_existing=True,
    )
    
    logger.info("📅 Scheduler initialized with business automation jobs")
    logger.info("   - daily_close_job: 04:00 AM")
    logger.info("   - inventory_snapshot_job: 04:05 AM")
    logger.info("   - expire_loyalty_points_job: 04:10 AM")
    
    return scheduler


def start_scheduler():
    """Start the scheduler. Safe to call multiple times."""
    global scheduler
    
    if scheduler is None:
        scheduler = init_scheduler()
    
    if not scheduler.running:
        scheduler.start()
        logger.info("✅ Scheduler started successfully")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    global scheduler
    
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("🛑 Scheduler shut down gracefully")


# ============================================
# Job 1: Daily Order Closure
# ============================================

async def daily_close_job():
    """
    Automatically close or flag stale orders.
    
    Business Logic:
    - Orders open for >24 hours are considered "abandoned"
    - Orders with items but unpaid are marked as "INCIDENCIA"
    - Orders without items are simply cancelled
    
    This prevents the POS from showing days-old orders and helps
    accountants identify missed payments.
    """
    logger.info("🔄 Running daily_close_job...")
    
    stale_threshold = datetime.utcnow() - timedelta(hours=24)
    orders_closed = 0
    orders_flagged = 0
    
    async with async_session_maker() as db:
        try:
            # Find all stale open orders
            query = select(Order).where(
                and_(
                    Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY]),
                    Order.created_at < stale_threshold
                )
            )
            
            result = await db.execute(query)
            stale_orders = result.scalars().all()
            
            for order in stale_orders:
                # Check if order has items
                items_query = select(func.count(OrderItem.id)).where(OrderItem.order_id == order.id)
                items_result = await db.execute(items_query)
                item_count = items_result.scalar() or 0
                
                if item_count > 0:
                    # Order has items but wasn't paid - flag as incident
                    order.status = OrderStatus.CANCELLED
                    order.notes = f"[INCIDENCIA AUTO] Orden no cerrada después de 24h. Items: {item_count}. Fecha original: {order.created_at.isoformat()}"
                    orders_flagged += 1
                    logger.warning(f"⚠️ Order {order.id} flagged as INCIDENCIA (had {item_count} items)")
                else:
                    # Empty order - just cancel
                    order.status = OrderStatus.CANCELLED
                    order.notes = "[AUTO-CLOSE] Orden vacía cerrada automáticamente"
                    orders_closed += 1
            
            await db.commit()
            
            logger.info(f"✅ daily_close_job completed: {orders_closed} closed, {orders_flagged} flagged as incidents")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ daily_close_job failed: {str(e)}")
            raise


# ============================================
# Job 2: Inventory Snapshot
# ============================================

async def inventory_snapshot_job():
    """
    Create a daily snapshot of current inventory levels.
    
    Purpose:
    - Historical tracking for trend analysis
    - Audit trail for inventory discrepancies
    - Data source for AI forecasting
    
    Creates InventoryTransaction records of type ADJUSTMENT with
    quantity=0 and stock_after=current_stock (snapshot marker).
    """
    logger.info("🔄 Running inventory_snapshot_job...")
    
    snapshots_created = 0
    
    async with async_session_maker() as db:
        try:
            # Get all active tenants
            tenants_query = select(Tenant).where(Tenant.is_active == True)
            tenants_result = await db.execute(tenants_query)
            tenants = tenants_result.scalars().all()
            
            for tenant in tenants:
                # Get all ingredients for this tenant
                ingredients_query = select(Ingredient).where(
                    and_(
                        Ingredient.tenant_id == tenant.id,
                        Ingredient.is_active == True
                    )
                )
                ingredients_result = await db.execute(ingredients_query)
                ingredients = ingredients_result.scalars().all()
                
                for ingredient in ingredients:
                    # Create snapshot transaction
                    snapshot = InventoryTransaction(
                        tenant_id=tenant.id,
                        ingredient_id=ingredient.id,
                        transaction_type=TransactionType.ADJUSTMENT,
                        quantity=0,  # Zero delta - just a snapshot
                        unit=ingredient.unit,
                        reference_type="daily_snapshot",
                        stock_after=ingredient.stock_quantity,
                        notes=f"Daily snapshot at {datetime.utcnow().isoformat()}"
                    )
                    db.add(snapshot)
                    snapshots_created += 1
            
            await db.commit()
            
            logger.info(f"✅ inventory_snapshot_job completed: {snapshots_created} snapshots created")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ inventory_snapshot_job failed: {str(e)}")
            raise


# ============================================
# Job 3: Expire Loyalty Points
# ============================================

async def expire_loyalty_points_job():
    """
    Process expired loyalty points across all tenants.
    
    Business Logic:
    - Points earned have an expiration date (typically 1 year)
    - Expired unprocessed EARN transactions get marked and deducted
    - Creates EXPIRE transaction type for audit trail
    - Updates customer's loyalty_points balance
    
    Note: This is a simplified FIFO deduction. For strict accounting,
    a more complex points ledger would be needed.
    """
    logger.info("🔄 Running expire_loyalty_points_job...")
    
    now = datetime.utcnow()
    points_expired = 0
    customers_affected = 0
    
    async with async_session_maker() as db:
        try:
            # Find expired EARN transactions that haven't been processed
            query = select(LoyaltyTransaction).where(
                and_(
                    LoyaltyTransaction.type == LoyaltyTransactionType.EARN,
                    LoyaltyTransaction.expires_at < now,
                    LoyaltyTransaction.processed_for_expiry == False,
                    LoyaltyTransaction.points_delta > 0
                )
            ).order_by(LoyaltyTransaction.created_at)
            
            result = await db.execute(query)
            expired_transactions = result.scalars().all()
            
            # Track affected customers for batch update
            customer_deductions: dict[UUID, float] = {}
            
            for trx in expired_transactions:
                deduction = trx.points_delta
                
                # Create expiration transaction
                expire_trx = LoyaltyTransaction(
                    customer_id=trx.customer_id,
                    order_id=None,
                    type=LoyaltyTransactionType.EXPIRE,
                    points_delta=-deduction,
                    amount_delta=0,
                    description=f"Points expired from transaction on {trx.created_at.date()}",
                    processed_for_expiry=True
                )
                db.add(expire_trx)
                
                # Mark original transaction as processed
                trx.processed_for_expiry = True
                
                # Accumulate deductions per customer
                if trx.customer_id not in customer_deductions:
                    customer_deductions[trx.customer_id] = 0
                customer_deductions[trx.customer_id] += deduction
                
                points_expired += deduction
            
            # Update customer balances
            for customer_id, total_deduction in customer_deductions.items():
                customer_query = select(Customer).where(Customer.id == customer_id)
                customer_result = await db.execute(customer_query)
                customer = customer_result.scalar_one_or_none()
                
                if customer:
                    customer.loyalty_points = max(0, customer.loyalty_points - total_deduction)
                    customers_affected += 1
            
            await db.commit()
            
            logger.info(
                f"✅ expire_loyalty_points_job completed: "
                f"{points_expired:.0f} points expired, {customers_affected} customers affected"
            )
            
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ expire_loyalty_points_job failed: {str(e)}")
            raise


# ============================================
# Manual Job Triggers (for testing/admin)
# ============================================

async def run_job_manually(job_name: str) -> dict:
    """
    Run a specific job manually (for admin panel or testing).
    
    Args:
        job_name: One of 'daily_close', 'inventory_snapshot', 'expire_points'
    
    Returns:
        dict with status and message
    """
    jobs = {
        "daily_close": daily_close_job,
        "inventory_snapshot": inventory_snapshot_job,
        "expire_points": expire_loyalty_points_job,
    }
    
    if job_name not in jobs:
        return {"status": "error", "message": f"Unknown job: {job_name}"}
    
    try:
        await jobs[job_name]()
        return {"status": "success", "message": f"Job '{job_name}' completed successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_scheduler_status() -> dict:
    """
    Get current scheduler status and next run times.
    Useful for admin dashboard.
    """
    global scheduler
    
    if scheduler is None or not scheduler.running:
        return {"running": False, "jobs": []}
    
    jobs_info = []
    for job in scheduler.get_jobs():
        jobs_info.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    
    return {
        "running": True,
        "timezone": "America/Mexico_City",
        "jobs": jobs_info
    }
