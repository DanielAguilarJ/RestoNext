"""
RestoNext MX - FastAPI Main Application
Entry point with CORS, WebSocket, and route registration

Production Features:
- APScheduler for automated business tasks
- Sentry for error tracking
- Redis pub/sub for WebSocket scaling
"""

import asyncio
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import get_settings
from app.core.database import init_db
from app.core.websocket_manager import ws_manager
from app.core.scheduler import init_scheduler, start_scheduler, shutdown_scheduler
from app.core.logging_config import setup_logging, set_log_context, clear_log_context, get_logger
from app.core.activity_logger import activity_logger

# Startup state tracking for health checks
_startup_complete = False

from app.api.auth import router as auth_router
from app.api.signup import router as signup_router
from app.api.pos import router as pos_router
from app.api.billing import router as billing_router
from app.api.analytics import router as analytics_router
from app.api.onboarding import router as onboarding_router
from app.api.cashier import router as cashier_router
from app.api.printer import router as printer_router
from app.api.procurement import router as procurement_router
from app.api.inventory import router as inventory_router
from app.api.catering import router as catering_router
from app.api.customers import router as customers_router
from app.api.loyalty import router as loyalty_router
from app.api.reservations import router as reservations_router
from app.api.promotions import router as promotions_router
from app.api.menu import router as menu_router
from app.api.dining import router as dining_router
from app.api.admin_tables import router as admin_tables_router
from app.api.admin import router as admin_router
from app.api.subscription import router as subscription_router, webhook_router as stripe_webhook_router
from app.api.legal import router as legal_router
from app.api.tables import router as tables_router
from app.api.activity import router as activity_router
from app.api.kds import router as kds_router

settings = get_settings()

# ============================================
# Sentry Initialization (Production Observability)
# ============================================

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        # Include request data but exclude sensitive headers
        send_default_pii=False,
        # Add RestoNext metadata
        release="restonext-api@1.0.0",
    )
    print(f"INFO:     Sentry initialized for environment: {settings.sentry_environment}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    - Startup: Initialize DB, Redis, and Scheduler
    - Shutdown: Gracefully close all connections
    """
    # Mark startup as complete early for Railway health checks
    # This allows the /health endpoint to return 200 during initialization
    global _startup_complete
    
    # ============================================
    # Startup
    # ============================================
    
    # Initialize logging system first
    log_level = "DEBUG" if settings.debug else "INFO"
    setup_logging(log_level=log_level, app_name="restonext-api")
    logger = get_logger("restonext.startup")
    
    activity_logger.startup("restonext-api", "1.0.0", settings.sentry_environment)
    logger.info(f"Environment: {settings.sentry_environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Initialize database (CRITICAL - must succeed)
    try:
        await init_db()
        print("INFO:     ✅ Database initialized successfully")
    except Exception as e:
        print(f"CRITICAL: ❌ Database initialization failed: {e}")
        raise  # Database is critical, fail fast
    
    # Connect to Redis for WebSocket pub/sub (OPTIONAL - must never block)
    try:
        # Extra safety: wrap in timeout at lifespan level too
        await asyncio.wait_for(ws_manager.connect_redis(), timeout=10.0)
    except asyncio.TimeoutError:
        print("WARNING:  ⚠️ Redis connection timed out at lifespan level. Continuing without Redis.")
    except asyncio.CancelledError:
        print("WARNING:  ⚠️ Redis connection was cancelled. Continuing without Redis.")
    except Exception as e:
        print(f"WARNING:  ⚠️ Redis connection failed: {type(e).__name__}: {e}")
    
    # Start Redis listener in background (only if connected, OPTIONAL)
    if ws_manager.redis_client is not None:
        asyncio.create_task(ws_manager.listen_redis())
        print("INFO:     📡 Redis pub/sub listener started")
    else:
        print("INFO:     📡 Redis pub/sub skipped (no connection)")
    
    # Initialize and start the scheduler (OPTIONAL)
    scheduler_enabled = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"
    if scheduler_enabled:
        try:
            init_scheduler()
            start_scheduler()
            print("INFO:     📅 APScheduler started - Business automation active")
        except Exception as e:
            print(f"WARNING:  ⚠️ Scheduler failed to start: {e}")
    else:
        print("INFO:     📅 Scheduler disabled via SCHEDULER_ENABLED=false")
    
    # Mark startup as complete for health checks
    _startup_complete = True
    print("INFO:     ✅ RestoNext MX API ready to serve requests")
    
    yield
    
    # ============================================
    # Shutdown
    # ============================================
    print("INFO:     🛑 Shutting down RestoNext MX API...")
    
    # Stop scheduler gracefully
    if scheduler_enabled:
        try:
            shutdown_scheduler()
            print("INFO:     📅 Scheduler stopped gracefully")
        except Exception as e:
            print(f"WARNING:  ⚠️ Scheduler shutdown error: {e}")
    
    # Disconnect from Redis
    await ws_manager.disconnect_redis()
    
    print("INFO:     👋 Goodbye!")


app = FastAPI(
    title="RestoNext MX API",
    description="Cloud-Native Restaurant Management SaaS for Mexico",
    version="1.0.0",
    lifespan=lifespan,
    # Configure docs to be accessible via root (DO strips /api)
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ============================================
# Request Logging Middleware
# ============================================

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Middleware to log all HTTP requests with timing.
    
    Features:
    - Generates unique request ID for tracing
    - Logs request start and completion
    - Tracks response time
    - Extracts user context from JWT if available
    """
    # Generate unique request ID
    request_id = str(uuid.uuid4())[:12]
    start_time = time.perf_counter()
    
    # Try to extract user info from JWT token
    user_id = None
    tenant_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_access_token
            token = auth_header[7:]
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            tenant_id = payload.get("tenant_id")
        except Exception:
            pass  # Invalid token, continue without context
    
    # Set logging context
    set_log_context(request_id=request_id, user_id=user_id, tenant_id=tenant_id)
    
    # Skip logging for health checks and static files
    path = request.url.path
    skip_logging = path in ["/health", "/ping", "/favicon.ico"] or path.startswith("/_next")
    
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Log the request (skip noisy endpoints)
        if not skip_logging:
            activity_logger.api_request(
                method=request.method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms
            )
        
        # Add request ID to response headers for client debugging
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as exc:
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Log the error
        activity_logger.error(
            error_type=type(exc).__name__,
            message=str(exc)[:200],
            metadata={
                "path": path,
                "method": request.method,
                "request_id": request_id,
                "duration_ms": round(duration_ms, 2)
            }
        )
        
        # Capture to Sentry if configured
        if settings.sentry_dsn:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("request_id", request_id)
                scope.set_context("request", {
                    "url": str(request.url),
                    "method": request.method,
                    "client_ip": request.client.host if request.client else None,
                })
                sentry_sdk.capture_exception(exc)
        
        # Return clean JSON response
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "Ha ocurrido un error inesperado. Por favor intenta de nuevo.",
                "ref": request_id
            },
            headers={"X-Request-ID": request_id}
        )
    finally:
        clear_log_context()


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(signup_router)  # Signup checkout flow
app.include_router(pos_router)
app.include_router(billing_router)
app.include_router(analytics_router)
app.include_router(onboarding_router)
app.include_router(cashier_router)
app.include_router(printer_router)
app.include_router(procurement_router)
app.include_router(inventory_router)
app.include_router(catering_router, prefix="/catering", tags=["Catering"])
app.include_router(customers_router, prefix="/customers", tags=["Customers"])
app.include_router(loyalty_router, prefix="/loyalty", tags=["Loyalty"])
app.include_router(reservations_router, prefix="/reservations", tags=["Reservations"])
app.include_router(promotions_router, prefix="/promotions", tags=["Promotions"])
app.include_router(menu_router, tags=["Menu"])
# Public dining endpoints (no /api prefix - consumer facing)
app.include_router(dining_router, tags=["Self-Service Dining"])
# Admin endpoints for table management
app.include_router(admin_tables_router, tags=["Admin - Tables"])
# Admin endpoints for system management (backups, jobs)
app.include_router(admin_router, tags=["Admin - System"])
# Subscription management (Stripe billing)
app.include_router(subscription_router, tags=["Subscription"])
# Stripe webhooks (public, no auth - signature verified internally)
app.include_router(stripe_webhook_router, tags=["Webhooks"])
# Legal compliance (terms, privacy - required for Stripe)
app.include_router(legal_router, tags=["Legal"])
# Table operations (transfer, etc.)
app.include_router(tables_router, tags=["POS - Tables"])
# Activity logging (frontend logs receiver)
app.include_router(activity_router, tags=["Logging"])
# KDS (Kitchen Display System) for cafeteria flow
app.include_router(kds_router, tags=["Kitchen Display"])


# ============================================
# WebSocket Endpoints
# ============================================

@app.websocket("/ws/kitchen")
async def kitchen_websocket(websocket: WebSocket):
    """
    WebSocket for Kitchen Display System (KDS).
    Receives new orders and item updates in real-time.
    """
    await ws_manager.connect(websocket, "kitchen")
    kitchen_count = len(ws_manager.active_connections.get("kitchen", set()))
    print(f"INFO:     🍳 Kitchen WS connected (total kitchen connections: {kitchen_count})")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WARNING:  Kitchen WS error: {type(e).__name__}: {e}")
    finally:
        ws_manager.disconnect(websocket, "kitchen")
        kitchen_count = len(ws_manager.active_connections.get("kitchen", set()))
        print(f"INFO:     🍳 Kitchen WS disconnected (remaining: {kitchen_count})")


@app.websocket("/ws/bar")
async def bar_websocket(websocket: WebSocket):
    """
    WebSocket for Bar Display.
    Only receives drink/bar items.
    """
    await ws_manager.connect(websocket, "bar")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, "bar")


@app.websocket("/ws/waiter")
async def waiter_websocket(websocket: WebSocket):
    """
    WebSocket for Waiter notifications.
    Receives item ready alerts and customer call waiter requests.
    """
    await ws_manager.connect(websocket, "waiter")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, "waiter")


@app.websocket("/ws/cashier")
async def cashier_websocket(websocket: WebSocket):
    """
    WebSocket for Cashier/Payment station.
    Receives bill request notifications with total amounts.
    Priority channel for closing service cycles.
    """
    await ws_manager.connect(websocket, "cashier")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, "cashier")


@app.websocket("/ws/pos")
async def pos_websocket(websocket: WebSocket):
    """
    WebSocket for POS Dashboard.
    Receives all table updates, bill requests, and order notifications.
    """
    await ws_manager.connect(websocket, "pos")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, "pos")


@app.websocket("/ws/customer/{table_number}")
async def customer_websocket(websocket: WebSocket, table_number: int):
    """
    WebSocket for Customer QR Menu.
    Allows customers to call waiter.
    """
    await ws_manager.connect(websocket, f"table_{table_number}")
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "call_waiter":
                # Notify waiters
                await ws_manager.notify_call_waiter(
                    table_number=table_number,
                    tenant_id=data.get("tenant_id", ""),
                )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(websocket, f"table_{table_number}")

# ============================================
# Health Check (Production Monitoring)
# ============================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker/K8s/Railway/DigitalOcean.
    
    Behavior:
    - During startup: Returns 200 with status "starting" (allows checks to pass during init)
    - After startup: Verifies database connectivity (required) and Redis (optional)
    
    Returns 200 if healthy/starting, 503 only if database is down after startup.
    """
    from datetime import datetime
    from sqlalchemy import text
    import redis.asyncio as aioredis
    
    # If startup hasn't completed, return 200 with "starting" status
    if not _startup_complete:
        return {
            "status": "starting",
            "service": "restonext-api",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Application is initializing..."
        }
    
    health_status = {
        "status": "healthy",
        "service": "restonext-api",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    database_healthy = True
    
    # Check Database (REQUIRED for healthy status)
    try:
        from app.core.database import async_session_maker
        async with async_session_maker() as db:
            await db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)[:100]
        }
        database_healthy = False
    
    # Check Redis (OPTIONAL - degraded is still 200)
    try:
        redis_client = aioredis.from_url(settings.redis_url)
        await redis_client.ping()
        await redis_client.close()
        health_status["checks"]["redis"] = {"status": "healthy"}
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "degraded",
            "error": str(e)[:100],
            "note": "WebSocket scaling disabled, local connections only"
        }
        # Redis is optional - don't fail health check
        health_status["status"] = "degraded"
    
    # Only fail if database is down (database is critical)
    if not database_healthy:
        health_status["status"] = "unhealthy"
        return JSONResponse(content=health_status, status_code=503)
    
    return health_status


@app.get("/system/scheduler")
async def scheduler_status():
    """
    Get scheduler status for admin dashboard.
    Shows all registered jobs and their next run times.
    """
    from app.core.scheduler import get_scheduler_status
    return get_scheduler_status()


@app.get("/system/info")
async def system_info():
    """System information for admin dashboard"""
    from app.core.scheduler import get_scheduler_status
    
    scheduler = get_scheduler_status()
    
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "environment": settings.sentry_environment,
        "scheduler": scheduler,
        "features": {
            "sentry": bool(settings.sentry_dsn),
            "redis": True,  # Always enabled in docker-compose
        }
    }


# =========================================================
# Root Endpoints (Dual support: / and /api/ prefixes)
# Needed because DigitalOcean preserves the /api prefix
# =========================================================

@app.get("/")
async def root():
    """API root"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",  # Updated for DO
    }


@app.get("/ping")
async def ping():
    """
    Ultra-simple ping endpoint. 
    No dependencies, no auth, just returns "pong".
    """
    return {"ping": "pong", "ok": True}


@app.get("/debug")
async def debug_info():
    """
    Debug endpoint for production diagnostics.
    Returns system information to help identify deployment issues.
    """
    import sys
    import platform
    from datetime import datetime
    
    info = {
        "timestamp": datetime.utcnow().isoformat(),
        "startup_complete": _startup_complete,
        "python_version": sys.version,
        "platform": platform.platform(),
        "environment": settings.sentry_environment,
        "debug_mode": settings.debug,
        "database_url_configured": bool(settings.database_url),
        "redis_url_configured": bool(settings.redis_url),
        "sentry_configured": bool(settings.sentry_dsn),
        "cors_origins": settings.allowed_origins,
    }
    
    # Check if Redis is connected
    info["redis_connected"] = ws_manager.redis_client is not None
    
    # Check database connection
    try:
        from app.core.database import async_session_maker
        from sqlalchemy import text
        async with async_session_maker() as db:
            await db.execute(text("SELECT 1"))
        info["database_connected"] = True
    except Exception as e:
        info["database_connected"] = False
        info["database_error"] = str(e)[:200]
    
    return info
