"""
RestoNext MX - KDS (Kitchen Display System) API Routes
Endpoints for cafeteria order flow and kitchen configuration
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    User, Tenant, Order, OrderItem, OrderStatus, OrderItemStatus, Table
)


router = APIRouter(prefix="/kds", tags=["Kitchen Display System"])


# ============================================
# Pydantic Schemas
# ============================================

class KDSConfig(BaseModel):
    """Kitchen Display System configuration"""
    mode: str = Field("restaurant", description="'cafeteria' or 'restaurant'")
    warning_minutes: int = Field(5, ge=1, le=30, description="Minutes before warning status")
    critical_minutes: int = Field(10, ge=1, le=60, description="Minutes before critical status")
    audio_alerts: bool = Field(True, description="Enable audio alerts for overdue orders")
    shake_animation: bool = Field(True, description="Enable shake animation for critical orders")


class KDSConfigResponse(BaseModel):
    mode: str
    warning_minutes: int
    critical_minutes: int
    audio_alerts: bool
    shake_animation: bool
    message: str


class MarkPaidRequest(BaseModel):
    payment_method: str = Field("cash", description="'cash', 'card', or 'transfer'")
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="'in_progress', 'ready', or 'delivered'")


class ItemStatusUpdate(BaseModel):
    status: str = Field(..., description="'preparing', 'ready', or 'served'")


class KDSOrderItem(BaseModel):
    id: str
    name: str
    quantity: int
    status: str
    notes: Optional[str]
    modifiers: List[str]


class KDSOrder(BaseModel):
    id: str
    table_number: int
    status: str
    created_at: datetime
    paid_at: Optional[datetime]
    items: List[KDSOrderItem]
    total: float
    notes: Optional[str]


class KDSOrdersResponse(BaseModel):
    orders: List[KDSOrder]
    total_count: int


# ============================================
# Helper Functions
# ============================================

def get_kds_config_from_tenant(tenant: Tenant) -> dict:
    """Extract KDS config from tenant features_config or return defaults"""
    features = tenant.features_config or {}
    kds = features.get("kds", {})
    return {
        "mode": kds.get("mode", "restaurant"),
        "warning_minutes": kds.get("warning_minutes", 5),
        "critical_minutes": kds.get("critical_minutes", 10),
        "audio_alerts": kds.get("audio_alerts", True),
        "shake_animation": kds.get("shake_animation", True),
    }


# ============================================
# API Endpoints
# ============================================

@router.get("/config", response_model=KDSConfigResponse)
async def get_kds_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get KDS configuration for the current tenant.
    Returns timing settings and mode (cafeteria/restaurant).
    """
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    config = get_kds_config_from_tenant(tenant)
    return KDSConfigResponse(**config, message="KDS configuration loaded")


@router.patch("/config", response_model=KDSConfigResponse)
async def update_kds_config(
    config: KDSConfig,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update KDS configuration for the current tenant.
    Only admins and managers can update configuration.
    """
    if current_user.role.value not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can update KDS config")
    
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update features_config with new KDS settings
    features = dict(tenant.features_config or {})
    features["kds"] = {
        "mode": config.mode,
        "warning_minutes": config.warning_minutes,
        "critical_minutes": config.critical_minutes,
        "audio_alerts": config.audio_alerts,
        "shake_animation": config.shake_animation,
    }
    tenant.features_config = features
    
    await db.commit()
    await db.refresh(tenant)
    
    return KDSConfigResponse(**get_kds_config_from_tenant(tenant), message="KDS configuration updated")


@router.post("/orders/{order_id}/paid", status_code=status.HTTP_200_OK)
async def mark_order_paid(
    order_id: UUID,
    request: MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark an order as paid (cafeteria flow).
    This sends the order to the kitchen display.
    
    Flow:
    1. Validates order belongs to user's tenant
    2. Updates status to IN_PROGRESS (now visible in kitchen)
    3. Sets paid_at timestamp
    4. Triggers WebSocket notification (to be implemented)
    """
    order = await db.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    
    # Validate order is in correct state for payment
    if order.status not in [OrderStatus.OPEN, OrderStatus.PENDING_PAYMENT]:
        raise HTTPException(
            status_code=400, 
            detail=f"Order cannot be marked as paid. Current status: {order.status.value}"
        )
    
    # Update order status and payment timestamp
    order.status = OrderStatus.IN_PROGRESS
    order.paid_at = datetime.utcnow()
    
    # Update all items to PENDING status (ready for kitchen)
    await db.execute(
        update(OrderItem)
        .where(OrderItem.order_id == order_id)
        .values(status=OrderItemStatus.PENDING)
    )
    
    await db.commit()
    
    # Send WebSocket notification to kitchen
    try:
        from app.core.websocket_manager import ws_manager
        from app.models.models import OrderItem, Table
        
        # Load order items for the notification
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order_id)
        )
        items = items_result.scalars().all()
        
        # Get table number
        table_number = 0
        if order.table_id:
            table = await db.get(Table, order.table_id)
            if table:
                table_number = table.number
        
        kds_items = []
        for item in items:
            modifiers = []
            if item.selected_modifiers:
                for mod in item.selected_modifiers:
                    if isinstance(mod, dict):
                        modifiers.append(mod.get("option_name", str(mod)))
                    else:
                        modifiers.append(str(mod))
            kds_items.append({
                "id": str(item.id),
                "name": item.menu_item_name,
                "quantity": item.quantity,
                "modifiers": modifiers,
                "notes": item.notes,
                "status": "pending",
            })
        
        await ws_manager.notify_kitchen_new_order({
            "id": str(order_id),
            "orderId": str(order_id),
            "order_id": str(order_id),
            "tableNumber": table_number,
            "table_number": table_number,
            "items": kds_items,
            "createdAt": order.paid_at.isoformat() if order.paid_at else datetime.utcnow().isoformat(),
            "created_at": order.paid_at.isoformat() if order.paid_at else datetime.utcnow().isoformat(),
        })
    except Exception as e:
        import logging
        logging.warning(f"Failed to send kitchen WebSocket notification for order {order_id}: {e}")
    
    return {
        "message": "Order marked as paid and sent to kitchen",
        "order_id": str(order_id),
        "status": "in_progress",
        "paid_at": order.paid_at.isoformat()
    }


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: UUID,
    request: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update order status from kitchen.
    Valid transitions: in_progress -> ready -> delivered
    """
    order = await db.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    
    # Validate status value
    valid_statuses = ["in_progress", "ready", "delivered"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Map string to enum
    status_map = {
        "in_progress": OrderStatus.IN_PROGRESS,
        "ready": OrderStatus.READY,
        "delivered": OrderStatus.DELIVERED,
    }
    
    order.status = status_map[request.status]
    await db.commit()
    
    return {
        "message": f"Order status updated to {request.status}",
        "order_id": str(order_id),
        "status": request.status
    }


@router.patch("/items/{item_id}/status")
async def update_item_status(
    item_id: UUID,
    request: ItemStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update individual item status from kitchen.
    Valid statuses: pending -> preparing -> ready -> served
    """
    item = await db.get(OrderItem, item_id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    # Get order to validate tenant
    order = await db.get(Order, item.order_id)
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Item does not belong to your restaurant")
    
    # Validate status value
    valid_statuses = ["pending", "preparing", "ready", "served"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Map string to enum
    status_map = {
        "pending": OrderItemStatus.PENDING,
        "preparing": OrderItemStatus.PREPARING,
        "ready": OrderItemStatus.READY,
        "served": OrderItemStatus.SERVED,
    }
    
    item.status = status_map[request.status]
    await db.commit()
    
    return {
        "message": f"Item status updated to {request.status}",
        "item_id": str(item_id),
        "status": request.status
    }


@router.get("/orders", response_model=KDSOrdersResponse)
async def get_kitchen_orders(
    include_statuses: str = Query("in_progress,ready", description="Comma-separated statuses to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all active kitchen orders for display.
    Mode-aware: In restaurant mode, also includes 'open' orders.
    Sorted by created_at (oldest first) for FIFO processing.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Parse statuses
    status_list = [s.strip() for s in include_statuses.split(",")]
    status_enums = []
    status_map = {
        "open": OrderStatus.OPEN,
        "pending_payment": OrderStatus.PENDING_PAYMENT,
        "in_progress": OrderStatus.IN_PROGRESS,
        "ready": OrderStatus.READY,
        "delivered": OrderStatus.DELIVERED,
    }
    
    for s in status_list:
        if s in status_map:
            status_enums.append(status_map[s])
    
    if not status_enums:
        status_enums = [OrderStatus.IN_PROGRESS, OrderStatus.READY]
    
    # Auto-include 'open' orders in restaurant mode
    # In restaurant mode, orders go from POS directly to kitchen (status=open or in_progress)
    # In cafeteria mode, only paid orders (in_progress) should appear
    try:
        tenant = await db.get(Tenant, current_user.tenant_id)
        kds_mode = "restaurant"  # default
        if tenant and tenant.features_config:
            kds_config = tenant.features_config.get("kds", {})
            kds_mode = kds_config.get("mode", "restaurant")
        
        if kds_mode == "restaurant" and OrderStatus.OPEN not in status_enums:
            status_enums.append(OrderStatus.OPEN)
            logger.info(f"KDS restaurant mode: including 'open' orders in query")
    except Exception as e:
        # If mode check fails, include open orders as fallback
        if OrderStatus.OPEN not in status_enums:
            status_enums.append(OrderStatus.OPEN)
        logger.warning(f"KDS mode check failed, including 'open' as fallback: {e}")
    
    logger.info(f"KDS query: tenant={current_user.tenant_id}, statuses={[s.value for s in status_enums]}")
    
    # Query orders with items
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.tenant_id == current_user.tenant_id,
                Order.status.in_(status_enums)
            )
        )
        .order_by(Order.paid_at.asc().nullsfirst(), Order.created_at.asc())
    )
    orders = result.scalars().all()
    
    logger.info(f"KDS query returned {len(orders)} orders: {[(str(o.id)[:8], o.status.value) for o in orders]}")
    
    # Format response
    kds_orders = []
    for order in orders:
        # Load items
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = items_result.scalars().all()
        
        # Get table number with proper null handling
        table_number = 0
        try:
            if order.table_id:
                table = await db.get(Table, order.table_id)
                if table:
                    table_number = table.number
        except Exception as e:
            # Log error but don't fail the whole request
            import logging
            logging.warning(f"Failed to get table number for order {order.id}: {e}")
        
        kds_items = []
        for item in items:
            # Parse modifiers from JSONB
            modifiers = []
            if item.selected_modifiers:
                for mod in item.selected_modifiers:
                    if isinstance(mod, dict):
                        modifiers.append(mod.get("option_name", str(mod)))
                    else:
                        modifiers.append(str(mod))
            
            kds_items.append(KDSOrderItem(
                id=str(item.id),
                name=item.menu_item_name,
                quantity=item.quantity,
                status=item.status.value,
                notes=item.notes,
                modifiers=modifiers
            ))
        
        kds_orders.append(KDSOrder(
            id=str(order.id),
            table_number=table_number,
            status=order.status.value,
            created_at=order.created_at,
            paid_at=order.paid_at,
            items=kds_items,
            total=order.total,
            notes=order.notes
        ))
    
    return KDSOrdersResponse(orders=kds_orders, total_count=len(kds_orders))


@router.delete("/orders/{order_id}/complete")
async def complete_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark an order as complete and remove from kitchen display.
    Sets status to DELIVERED.
    """
    order = await db.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    
    order.status = OrderStatus.DELIVERED
    
    # Mark all items as served
    await db.execute(
        update(OrderItem)
        .where(OrderItem.order_id == order_id)
        .values(status=OrderItemStatus.SERVED)
    )
    
    await db.commit()
    
    return {
        "message": "Order completed and removed from kitchen display",
        "order_id": str(order_id)
    }
