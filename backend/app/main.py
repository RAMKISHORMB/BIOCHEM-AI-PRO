import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal, ensure_database_schema
from app.models import User, UserRole, TestAnalyte, ReferenceRange
from app.core.security import get_password_hash
from app.services.reference_data_seeder import seed_standard_biochemistry_library
from app.api.v1 import (
    auth,
    patients,
    reference_ranges,
    dashboard,
    labs,
    interpretations,
    pathways,
    genetics,
    ai,
    knowledge,
    ml,
    history,
    reports,
    audit,
    system_settings,
    biochemical
)

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("biochem_ai")

def seed_initial_data():
    """Seed initial administrator and standard traceable clinical biochemistry reference library."""
    db = SessionLocal()
    try:
        # 1. Seed initial administrator only if explicitly configured via environment variables
        admin_count = db.query(User).count()
        if admin_count == 0:
            admin_email = settings.ADMIN_EMAIL
            admin_password = settings.ADMIN_PASSWORD
            if admin_email and admin_password:
                logger.info(f"Initializing configured administrator account ({admin_email.strip()})...")
                admin_user = User(
                    email=admin_email.strip().lower(),
                    hashed_password=get_password_hash(admin_password),
                    full_name="Chief Medical Biochemist",
                    role=UserRole.ADMIN.value,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                logger.info("Configured administrator account seeded successfully.")
            else:
                logger.info(
                    "No initial administrator seeded (ADMIN_EMAIL and/or ADMIN_PASSWORD environment variables not provided). "
                    "The first user who registers through /auth/register will automatically be assigned the ADMIN role."
                )
        
        # 2. Seed standard clinical biochemistry library if empty
        seed_standard_biochemistry_library(db)
    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed necessary defaults
    logger.info("BIOCHEM AI Platform backend starting up...")
    Base.metadata.create_all(bind=engine)
    ensure_database_schema(engine)
    seed_initial_data()
    yield
    # Shutdown
    logger.info("BIOCHEM AI Platform backend shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. This event has been logged for security audit."},
    )

# Root and health checks
@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }

# Include API v1 routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(reference_ranges.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(labs.router, prefix=settings.API_V1_STR)
app.include_router(interpretations.router, prefix=settings.API_V1_STR)
app.include_router(pathways.router, prefix=settings.API_V1_STR)
app.include_router(genetics.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(knowledge.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(system_settings.router, prefix=settings.API_V1_STR)
app.include_router(biochemical.router, prefix=settings.API_V1_STR)
