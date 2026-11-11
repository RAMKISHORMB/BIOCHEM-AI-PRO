import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Test environment configuration
os.environ["ENVIRONMENT"] = "test"
os.environ["ADMIN_EMAIL"] = "admin@biochem.ai"
os.environ["ADMIN_PASSWORD"] = "Password123!"

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# Ensure settings picks up test admin env vars
settings.ADMIN_EMAIL = "admin@biochem.ai"
settings.ADMIN_PASSWORD = "Password123!"

# Use in-memory SQLite specifically for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_test_admin(db):
    """Seed initial administrator for tests from environment settings."""
    admin_count = db.query(User).filter(User.role == UserRole.ADMIN.value).count()
    if admin_count == 0:
        admin_user = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="Chief Medical Biochemist",
            role=UserRole.ADMIN.value,
            is_active=True
        )
        db.add(admin_user)
        db.commit()

@pytest.fixture(scope="function")
def db_session():
    """Yields a fresh, isolated database session per test with initial admin provisioned."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        seed_test_admin(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Provides a TestClient overriding get_db with test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
