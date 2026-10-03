"""
FastAPI Application Entry Point
Smart E-Commerce Platform
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
import os

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import (
    validation_exception_handler,
    integrity_error_handler,
    operational_error_handler,
    generic_exception_handler,
)

# ─── Routers ─────────────────────────────────────────────────────────────────
from app.auth.router import router as auth_router
from app.products.router import router as products_router
from app.categories.router import router as categories_router
from app.cart.router import router as cart_router
from app.orders.router import orders_router, checkout_router
from app.payments.router import router as payments_router
from app.notifications.router import router as notifications_router
from app.analytics.router import router as analytics_router
from app.analytics.reports_router import router as reports_router
from app.websocket.router import router as ws_router

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Environment: {settings.APP_ENV}")
    logger.info(f"   Database: MySQL (aiomysql)")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "products"), exist_ok=True)

    yield

    logger.info("👋 Shutting down application")


# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## Smart E-Commerce Platform API

A production-ready e-commerce REST API built with FastAPI + MySQL.

### Features
- 🔐 JWT Authentication + Auth0 Social Login
- 🛍️ Product Catalog with Search, Filter, Sort
- 🛒 Shopping Cart with Real-time Stock Validation
- 💳 Stripe Payment Integration
- 📦 Order Management with Status Lifecycle
- 🔔 Real-time WebSocket Notifications
- 📊 Analytics Dashboard
- 📁 CSV/PDF Report Export
    """,
    docs_url="/docs",
    redoc_url=None,  # Disabled to provide custom route with pinned JS
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

from fastapi.openapi.docs import get_redoc_html

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js",
    )

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Exception Handlers ───────────────────────────────────────────────────────
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ─── Static Files (uploaded images) ──────────────────────────────────────────
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── API Routes ───────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(products_router, prefix=API_PREFIX)
app.include_router(categories_router, prefix=API_PREFIX)
app.include_router(cart_router, prefix=API_PREFIX)
app.include_router(checkout_router, prefix=API_PREFIX)
app.include_router(orders_router, prefix=API_PREFIX)
app.include_router(payments_router, prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)

# WebSocket routes (no API prefix)
app.include_router(ws_router)


# ─── Health Checks ────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/ready", tags=["Health"])
async def ready():
    """Check if database and Redis are reachable."""
    from app.core.database import engine
    import redis.asyncio as aioredis

    checks = {}
    overall = "ready"

    # Check MySQL
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        overall = "not_ready"

    # Check Redis
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"
        # Redis not critical for basic operation

    return {"status": overall, "checks": checks}


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "redoc": "/redoc",
        "version": settings.APP_VERSION,
    }
