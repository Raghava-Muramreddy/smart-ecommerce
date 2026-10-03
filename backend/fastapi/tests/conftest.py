"""
Test configuration and fixtures.
Uses an in-memory SQLite for unit tests, or a test MySQL DB for integration tests.
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import get_db, Base
from app.models import User, UserRole, AuthProvider, NotificationPreference
from app.core.security import hash_password

# Use in-memory SQLite for tests (no MySQL required for unit tests)
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db):
    async def override_db():
        yield test_db

    app.dependency_overrides[get_db] = override_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def customer_user(test_db) -> User:
    user = User(
        name="Test Customer",
        email="testcustomer@test.com",
        password_hash=hash_password("TestPass123!"),
        role=UserRole.CUSTOMER,
        auth_provider=AuthProvider.LOCAL,
        is_active=True,
        is_verified=True,
    )
    test_db.add(user)
    test_db.add(NotificationPreference(user_id=user.id))
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(test_db) -> User:
    user = User(
        name="Test Admin",
        email="testadmin@test.com",
        password_hash=hash_password("Admin123!"),
        role=UserRole.ADMIN,
        auth_provider=AuthProvider.LOCAL,
        is_active=True,
        is_verified=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user
