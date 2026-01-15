import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
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
    """Initialize database tables with retry logic"""
    max_retries = 5
    retry_delay = 5
    
    # Show where we are trying to connect (safe logging)
    safe_url = settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url
    logger.info(f"🚀 Intentando conectar a la base de datos en: {safe_url}")

    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Conexión a la base de datos exitosa y tablas inicializadas.")
            return
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"⚠️ Error conectando (reintento {i+1}/{max_retries}): {e}")
                logger.info(f"⏳ Esperando {retry_delay} segundos...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("❌ No se pudo conectar a la base de datos tras varios intentos.")
                raise e
