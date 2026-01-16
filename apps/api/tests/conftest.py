"""
RestoNext MX - Pytest Configuration
Fixtures and settings for testing
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from uuid import uuid4

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Test database URL (use separate test DB)
TEST_DATABASE_URL = "postgresql+asyncpg://restonext:restonext_dev@localhost:5433/restonext_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create async engine for tests"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a new database session for each test"""
    async_session = async_sessionmaker(
        test_engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing API endpoints"""
    from main import app
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def tenant_id() -> str:
    """Generate a test tenant ID"""
    return str(uuid4())


@pytest.fixture
def table_id() -> str:
    """Generate a test table ID"""
    return str(uuid4())


@pytest.fixture
def table_token() -> str:
    """Generate a test table token"""
    return str(uuid4())
