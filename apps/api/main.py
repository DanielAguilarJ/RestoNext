"""
RestoNext MX - FastAPI Main Application
Entry point with CORS, WebSocket, and route registration
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.core.websocket_manager import ws_manager

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

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    - Startup: Initialize DB and Redis connections
    - Shutdown: Close connections
    """
    # Startup
    await init_db()
    await ws_manager.connect_redis()
    
    # Start Redis listener in background
    asyncio.create_task(ws_manager.listen_redis())
    
    yield
    
    # Shutdown
    await ws_manager.disconnect_redis()


app = FastAPI(
    title="RestoNext MX API",
    description="Cloud-Native Restaurant Management SaaS for Mexico",
    version="1.0.0",
    lifespan=lifespan,
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


@app.get("/")
async def root():
    """API root"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }
