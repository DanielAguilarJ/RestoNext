import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Create async engine with optimized settings for Railway
# - NullPool: Better for serverless/container environments (no stale connections)
# - echo=False: Disable SQL logging even in debug to speed up startup
engine = create_async_engine(
    settings.database_url,
    echo=False,  # Always disable SQL echo to prevent log spam during init
    future=True,
    poolclass=NullPool,  # Use NullPool for Railway (serverless-friendly)
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables with retry logic and timeout.
    CRITICAL: This must complete within 60 seconds or the app will fail fast.
    """
    max_retries = 3
    retry_delay = 3
    init_timeout = 60  # seconds
    
    # Show where we are trying to connect (safe logging)
    safe_url = settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url
    logger.info(f"🚀 Connecting to database: {safe_url}")

    async def _create_tables():
        """Inner function to create tables with retry"""
        for i in range(max_retries):
            try:
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                logger.info("✅ Database tables initialized successfully.")
                return
            except Exception as e:
                if i < max_retries - 1:
                    logger.warning(f"⚠️ DB connection error (retry {i+1}/{max_retries}): {e}")
                    await asyncio.sleep(retry_delay)
                else:
                    raise e

    try:
        # Wrap entire initialization in a timeout
        await asyncio.wait_for(_create_tables(), timeout=init_timeout)
    except asyncio.TimeoutError:
        logger.error(f"❌ Database initialization timed out after {init_timeout}s")
        raise RuntimeError(f"Database initialization timed out after {init_timeout}s")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

