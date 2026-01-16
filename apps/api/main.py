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

# Import routers
from app.api.auth import router as auth_router
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
    # ============================================
    # Startup
    # ============================================
    print("INFO:     🚀 Starting RestoNext MX API...")
    
    # Initialize database
    await init_db()
    
    # Connect to Redis for WebSocket pub/sub
    await ws_manager.connect_redis()
    
    # Start Redis listener in background
    asyncio.create_task(ws_manager.listen_redis())
    
    # Initialize and start the scheduler (if enabled)
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
)


# ============================================
# Error Handling Middleware (Sentry Integration)
# ============================================

@app.middleware("http")
async def sentry_error_middleware(request: Request, call_next):
    """
    Middleware to capture unhandled exceptions and return clean error responses.
    
    Features:
    - Captures errors to Sentry with event ID
    - Returns clean JSON response to client
    - Includes reference ID for support
    """
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        # Generate unique error reference ID
        error_ref = str(uuid.uuid4())[:8]
        
        # Capture to Sentry if configured
        if settings.sentry_dsn:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error_ref", error_ref)
                scope.set_context("request", {
                    "url": str(request.url),
                    "method": request.method,
                    "client_ip": request.client.host if request.client else None,
                })
                sentry_sdk.capture_exception(exc)
        
        # Log the error
        print(f"ERROR [{error_ref}]: {type(exc).__name__}: {str(exc)}")
        
        # Return clean JSON response
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "Ha ocurrido un error inesperado. Por favor intenta de nuevo.",
                "ref": error_ref
            }
        )


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router, prefix="/api")
app.include_router(pos_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(onboarding_router, prefix="/api")
app.include_router(cashier_router, prefix="/api")
app.include_router(printer_router, prefix="/api")
app.include_router(procurement_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(catering_router, prefix="/api/catering", tags=["Catering"])
app.include_router(customers_router, prefix="/api/customers", tags=["Customers"])
app.include_router(loyalty_router, prefix="/api/loyalty", tags=["Loyalty"])
app.include_router(reservations_router, prefix="/api/reservations", tags=["Reservations"])
app.include_router(promotions_router, prefix="/api/promotions", tags=["Promotions"])
app.include_router(menu_router, prefix="/api", tags=["Menu"])
# Public dining endpoints (no /api prefix - consumer facing)
app.include_router(dining_router, prefix="/api", tags=["Self-Service Dining"])
# Admin endpoints for table management
app.include_router(admin_tables_router, prefix="/api", tags=["Admin - Tables"])


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
    try:
        while True:
            # Keep connection alive, receive pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "kitchen")


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
        ws_manager.disconnect(websocket, f"table_{table_number}")


# ============================================
# Health Check
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker/K8s"""
    return {"status": "healthy", "service": "restonext-api"}


@app.get("/api/system/scheduler")
async def scheduler_status():
    """
    Get scheduler status for admin dashboard.
    Shows all registered jobs and their next run times.
    """
    from app.core.scheduler import get_scheduler_status
    return get_scheduler_status()


@app.get("/api/system/info")
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


@app.get("/")
async def root():
    """API root"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }
