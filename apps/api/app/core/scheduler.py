"""
RestoNext MX - APScheduler Business Automation
===============================================
Automated background tasks for production SaaS operations.

Tasks:
1. daily_close_job - Close/flag stale orders at 4 AM
2. inventory_snapshot_job - Daily inventory snapshot for historical tracking
3. expire_loyalty_points - Process expired loyalty points
4. db_backup_job - Database backup with local storage and rotation

Schedule: All tasks run at early morning hours (Mexico City time)

Backup Strategy (Local-First):
- Uses pg_dump for PostgreSQL database backup
- Compresses to .sql.gz format
- Stores in apps/api/backups/ directory
- Automatic 7-day rotation (deletes older backups)
- Handles disk full errors gracefully
"""

import logging
import os
import gzip
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from uuid import UUID
from urllib.parse import urlparse

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

# Backup configuration
BACKUP_DIR = Path(__file__).parent.parent.parent / "backups"
BACKUP_RETENTION_DAYS = 7
MAX_BACKUP_SIZE_GB = 5  # Maximum total backup storage in GB


# ============================================
# Scheduler Initialization
# ============================================

def create_scheduler() -> AsyncIOScheduler:
    """
    Create and configure the APScheduler instance.
    Uses AsyncIOScheduler for compatibility with FastAPI's event loop.
    """
    # Try to use Mexico City timezone, fallback to UTC if not available
    try:
        import pytz
        tz = "America/Mexico_City"
    except ImportError:
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo("America/Mexico_City")  # Test if it exists
            tz = "America/Mexico_City"
        except Exception:
            logger.warning("⚠️ Mexico City timezone not available, using UTC")
            tz = "UTC"
    
    return AsyncIOScheduler(
        timezone=tz,
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
    # Register Jobs - All run at early morning (Mexico City)
    # ============================================
    
    # 0. Database Backup - 3:00 AM (before any other jobs)
    scheduler.add_job(
        db_backup_job,
        trigger=CronTrigger(hour=3, minute=0, timezone="America/Mexico_City"),
        id="db_backup_job",
        name="Database Backup",
        replace_existing=True,
    )
    
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
    logger.info("   - db_backup_job: 03:00 AM")
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
# Job 4: Database Backup (Local-First Strategy)
# ============================================

def _parse_database_url(database_url: str) -> dict:
    """
    Parse DATABASE_URL into components for pg_dump.
    Handles Railway/Heroku style URLs.
    """
    # Convert asyncpg URL back to standard postgres
    url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgres+asyncpg://", "postgresql://")
    
    parsed = urlparse(url)
    
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
        "database": parsed.path.lstrip("/") if parsed.path else "restonext",
    }


def _get_backup_dir_size_bytes() -> int:
    """Calculate total size of backup directory in bytes."""
    total_size = 0
    if BACKUP_DIR.exists():
        for file in BACKUP_DIR.glob("*.sql.gz"):
            total_size += file.stat().st_size
    return total_size


def _rotate_old_backups():
    """
    Delete backups older than BACKUP_RETENTION_DAYS.
    Also enforces MAX_BACKUP_SIZE_GB limit.
    """
    if not BACKUP_DIR.exists():
        return
    
    now = datetime.now()
    deleted_count = 0
    
    # Delete by age
    for backup_file in BACKUP_DIR.glob("*.sql.gz"):
        file_age = now - datetime.fromtimestamp(backup_file.stat().st_mtime)
        if file_age.days > BACKUP_RETENTION_DAYS:
            try:
                backup_file.unlink()
                deleted_count += 1
                logger.info(f"🗑️ Deleted old backup: {backup_file.name}")
            except Exception as e:
                logger.error(f"Failed to delete backup {backup_file.name}: {e}")
    
    # Enforce size limit - delete oldest first if over limit
    max_bytes = MAX_BACKUP_SIZE_GB * 1024 * 1024 * 1024
    while _get_backup_dir_size_bytes() > max_bytes:
        oldest_file = None
        oldest_time = None
        
        for backup_file in BACKUP_DIR.glob("*.sql.gz"):
            mtime = backup_file.stat().st_mtime
            if oldest_time is None or mtime < oldest_time:
                oldest_time = mtime
                oldest_file = backup_file
        
        if oldest_file:
            try:
                oldest_file.unlink()
                deleted_count += 1
                logger.info(f"🗑️ Deleted backup (size limit): {oldest_file.name}")
            except Exception:
                break  # Avoid infinite loop
        else:
            break
    
    if deleted_count > 0:
        logger.info(f"✅ Rotated {deleted_count} old backup(s)")


def _format_bytes(size_bytes: int) -> str:
    """Format bytes to human readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


async def db_backup_job():
    """
    Create a compressed backup of the PostgreSQL database.
    
    Strategy (Local-First):
    - Uses pg_dump to create SQL backup
    - Compresses with gzip
    - Stores locally in apps/api/backups/
    - Automatic rotation after 7 days
    - Graceful handling of disk full errors
    
    File naming: restonext_backup_YYYYMMDD_HHMMSS.sql.gz
    """
    logger.info("🔄 Running db_backup_job...")
    
    # Ensure backup directory exists
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        logger.error(f"❌ Cannot create backup directory: {e}")
        return
    
    # Rotate old backups first
    _rotate_old_backups()
    
    # Check available disk space (rough check)
    try:
        disk_usage = shutil.disk_usage(BACKUP_DIR)
        free_gb = disk_usage.free / (1024 * 1024 * 1024)
        if free_gb < 0.5:  # Less than 500MB free
            logger.error(f"❌ Disk space critically low: {free_gb:.2f} GB free. Skipping backup.")
            return
    except Exception as e:
        logger.warning(f"⚠️ Could not check disk space: {e}")
    
    # Parse database URL
    try:
        db_config = _parse_database_url(settings.database_url)
    except Exception as e:
        logger.error(f"❌ Failed to parse DATABASE_URL: {e}")
        return
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"restonext_backup_{timestamp}.sql.gz"
    backup_path = BACKUP_DIR / backup_filename
    temp_sql_path = BACKUP_DIR / f"temp_{timestamp}.sql"
    
    try:
        # Set PGPASSWORD environment variable for pg_dump
        env = os.environ.copy()
        env["PGPASSWORD"] = db_config["password"]
        
        # Run pg_dump
        logger.info(f"📦 Creating backup: {backup_filename}")
        
        pg_dump_cmd = [
            "pg_dump",
            "-h", db_config["host"],
            "-p", str(db_config["port"]),
            "-U", db_config["user"],
            "-d", db_config["database"],
            "-f", str(temp_sql_path),
            "--no-owner",
            "--no-acl",
            "--clean",
            "--if-exists",
        ]
        
        result = subprocess.run(
            pg_dump_cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or "Unknown pg_dump error"
            logger.error(f"❌ pg_dump failed: {error_msg}")
            # Clean up temp file if exists
            if temp_sql_path.exists():
                temp_sql_path.unlink()
            return
        
        # Compress the backup
        logger.info("🗜️ Compressing backup...")
        with open(temp_sql_path, 'rb') as f_in:
            with gzip.open(backup_path, 'wb', compresslevel=9) as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove uncompressed temp file
        temp_sql_path.unlink()
        
        # Get backup size
        backup_size = backup_path.stat().st_size
        backup_size_str = _format_bytes(backup_size)
        
        logger.info(f"✅ db_backup_job completed: {backup_filename} ({backup_size_str})")
        
        # Log total backup storage
        total_backup_size = _get_backup_dir_size_bytes()
        logger.info(f"📊 Total backup storage: {_format_bytes(total_backup_size)}")
        
    except subprocess.TimeoutExpired:
        logger.error("❌ pg_dump timed out after 10 minutes")
        if temp_sql_path.exists():
            temp_sql_path.unlink()
    except OSError as e:
        # Handle disk full errors
        if "No space left on device" in str(e) or e.errno == 28:
            logger.error("❌ DISK FULL: Cannot create backup. Please free up disk space.")
            # Try to clean up partial files
            if temp_sql_path.exists():
                temp_sql_path.unlink()
            if backup_path.exists():
                backup_path.unlink()
        else:
            logger.error(f"❌ OS error during backup: {e}")
    except Exception as e:
        logger.error(f"❌ db_backup_job failed: {str(e)}")
        # Clean up any partial files
        if temp_sql_path.exists():
            try:
                temp_sql_path.unlink()
            except:
                pass
        if backup_path.exists():
            try:
                backup_path.unlink()
            except:
                pass


def list_backups() -> list[dict]:
    """
    List all available backup files.
    Returns list of dicts with filename, size, and created time.
    """
    backups = []
    
    if not BACKUP_DIR.exists():
        return backups
    
    for backup_file in sorted(BACKUP_DIR.glob("*.sql.gz"), reverse=True):
        stat = backup_file.stat()
        backups.append({
            "filename": backup_file.name,
            "size": _format_bytes(stat.st_size),
            "size_bytes": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    
    return backups


def get_backup_path(filename: str) -> Optional[Path]:
    """
    Get full path to a backup file.
    Returns None if file doesn't exist or is outside backup directory.
    """
    if not BACKUP_DIR.exists():
        return None
    
    # Sanitize filename to prevent directory traversal
    safe_filename = Path(filename).name
    if not safe_filename.endswith(".sql.gz"):
        return None
    
    backup_path = BACKUP_DIR / safe_filename
    
    if backup_path.exists() and backup_path.is_file():
        return backup_path
    
    return None


# ============================================
# Manual Job Triggers (for testing/admin)
# ============================================

async def run_job_manually(job_name: str) -> dict:
    """
    Run a specific job manually (for admin panel or testing).
    
    Args:
        job_name: One of 'daily_close', 'inventory_snapshot', 'expire_points', 'db_backup'
    
    Returns:
        dict with status and message
    """
    jobs = {
        "daily_close": daily_close_job,
        "inventory_snapshot": inventory_snapshot_job,
        "expire_points": expire_loyalty_points_job,
        "db_backup": db_backup_job,
    }
    
    if job_name not in jobs:
        return {"status": "error", "message": f"Unknown job: {job_name}. Available: {list(jobs.keys())}"}
    
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

