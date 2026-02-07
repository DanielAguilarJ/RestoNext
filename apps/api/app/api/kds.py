"""
RestoNext MX - KDS (Kitchen Display System) API Routes
Complete kitchen flow: orders arrive -> timers -> alerts -> ready -> deliver

Features:
- Configurable warning/critical thresholds per tenant
- Per-item prep_time_minutes for individual countdown timers
- WebSocket notifications on every status change
- Auto order completion when all items ready
- Full status transition validation
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.websocket_manager import ws_manager
from app.models.models import (
    User, Tenant, Order, OrderItem, OrderStatus, OrderItemStatus, Table
)


router = APIRouter(prefix="/kds", tags=["Kitchen Display System"])


# ============================================
# Pydantic Schemas
# ============================================

class KDSConfig(BaseModel):
    mode: str = Field("restaurant", description="cafeteria or restaurant")
    warning_minutes: int = Field(5, ge=1, le=30)
    critical_minutes: int = Field(10, ge=1, le=60)
    audio_alerts: bool = Field(True)
    shake_animation: bool = Field(True)
    auto_complete_when_ready: bool = Field(True)


class KDSConfigResponse(BaseModel):
    mode: str
    warning_minutes: int
    critical_minutes: int
    audio_alerts: bool
    shake_animation: bool
    auto_complete_when_ready: bool
    message: str


class MarkPaidRequest(BaseModel):
    payment_method: str = Field("cash")
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(...)


class ItemStatusUpdate(BaseModel):
    status: str = Field(...)


class KDSOrderItem(BaseModel):
    id: str
    name: str
    quantity: int
    status: str
    notes: Optional[str]
    modifiers: List[str]
    prep_time_minutes: int = 15


class KDSOrder(BaseModel):
    id: str
    table_number: int
    order_number: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime]
    items: List[KDSOrderItem]
    total: float
    notes: Optional[str]
    order_source: str = "pos"
    max_prep_time_minutes: int = 15


class KDSOrdersResponse(BaseModel):
    orders: List[KDSOrder]
    total_count: int


# ============================================
# Helpers
# ============================================

def get_kds_config_from_tenant(tenant: Tenant) -> dict:
    features = tenant.features_config or {}
    kds = features.get("kds", {})
    return {
        "mode": kds.get("mode", "restaurant"),
        "warning_minutes": kds.get("warning_minutes", 5),
        "critical_minutes": kds.get("critical_minutes", 10),
        "audio_alerts": kds.get("audio_alerts", True),
        "shake_animation": kds.get("shake_animation", True),
        "auto_complete_when_ready": kds.get("auto_complete_when_ready", True),
    }


def format_order_number(order: Order, table_number: int) -> str:
    return f"#{table_number}-{str(order.id)[:4].upper()}"


async def build_kds_order(order: Order, items: List[OrderItem], table_number: int) -> KDSOrder:
    kds_items = []
    max_prep = 15
    for item in items:
        modifiers = []
        if item.selected_modifiers:
            for mod in item.selected_modifiers:
                if isinstance(mod, dict):
                    modifiers.append(mod.get("option_name", str(mod)))
                else:
                    modifiers.append(str(mod))
        prep_time = getattr(item, "prep_time_minutes", 15) or 15
        if prep_time > max_prep:
            max_prep = prep_time
        kds_items.append(KDSOrderItem(
            id=str(item.id),
            name=item.menu_item_name,
            quantity=item.quantity,
            status=item.status.value,
            notes=item.notes,
            modifiers=modifiers,
            prep_time_minutes=prep_time,
        ))
    return KDSOrder(
        id=str(order.id),
        table_number=table_number,
        order_number=format_order_number(order, table_number),
        status=order.status.value,
        created_at=order.created_at,
        paid_at=order.paid_at,
        items=kds_items,
        total=order.total,
        notes=order.notes,
        order_source=order.order_source.value if hasattr(order.order_source, "value") else str(order.order_source),
        max_prep_time_minutes=max_prep,
    )


async def get_table_number(db: AsyncSession, table_id) -> int:
    if not table_id:
        return 0
    try:
        table = await db.get(Table, table_id)
        return table.number if table else 0
    except Exception:
        return 0


async def broadcast_kitchen_update(order, items, table_number, event_type="order_update"):
    try:
        kds_order = await build_kds_order(order, items, table_number)
        await ws_manager.broadcast_to_channel({
            "event": f"kitchen:{event_type}",
            "payload": kds_order.model_dump(mode="json")
        }, "kitchen")
    except Exception as e:
        import logging
        logging.warning(f"WS broadcast failed: {e}")


async def broadcast_item_update(order_id, item_id, new_status):
    try:
        await ws_manager.broadcast_to_channel({
            "event": "kitchen:item_update",
            "payload": {"order_id": str(order_id), "item_id": str(item_id), "status": new_status}
        }, "kitchen")
    except Exception as e:
        import logging
        logging.warning(f"WS item broadcast failed: {e}")


async def broadcast_order_complete(order_id, table_number):
    try:
        payload = {"order_id": str(order_id), "table_number": table_number}
        await ws_manager.broadcast_to_channel(
            {"event": "kitchen:order_complete", "payload": payload}, "kitchen"
        )
        msg = f"Pedido listo! Mesa {table_number}" if table_number else "Pedido listo!"
        await ws_manager.broadcast_to_channel(
            {"event": "kitchen:order_ready", "payload": {**payload, "message": msg}},
            "waiter"
        )
    except Exception as e:
        import logging
        logging.warning(f"WS complete broadcast failed: {e}")


VALID_ITEM_TRANSITIONS = {
    "pending": ["preparing"],
    "preparing": ["ready"],
    "ready": ["served"],
}


# ============================================
# Endpoints
# ============================================

@router.get("/config", response_model=KDSConfigResponse)
async def get_kds_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    if current_user.role.value not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can update KDS config")
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    features = dict(tenant.features_config or {})
    features["kds"] = {
        "mode": config.mode,
        "warning_minutes": config.warning_minutes,
        "critical_minutes": config.critical_minutes,
        "audio_alerts": config.audio_alerts,
        "shake_animation": config.shake_animation,
        "auto_complete_when_ready": config.auto_complete_when_ready,
    }
    tenant.features_config = features
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "features_config")
    await db.commit()
    await db.refresh(tenant)
    return KDSConfigResponse(
        **get_kds_config_from_tenant(tenant), message="KDS configuration updated"
    )


@router.post("/orders/{order_id}/paid", status_code=status.HTTP_200_OK)
async def mark_order_paid(
    order_id: UUID,
    request: MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    if order.status not in [OrderStatus.OPEN, OrderStatus.PENDING_PAYMENT]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark as paid. Current status: {order.status.value}"
        )
    order.status = OrderStatus.IN_PROGRESS
    order.paid_at = datetime.utcnow()
    await db.execute(
        update(OrderItem).where(OrderItem.order_id == order_id).values(status=OrderItemStatus.PENDING)
    )
    await db.commit()
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    items = items_result.scalars().all()
    table_number = await get_table_number(db, order.table_id)
    kds_order = await build_kds_order(order, items, table_number)
    await ws_manager.notify_kitchen_new_order(kds_order.model_dump(mode="json"))
    return {
        "message": "Order sent to kitchen",
        "order_id": str(order_id),
        "status": "in_progress",
        "paid_at": order.paid_at.isoformat(),
    }


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: UUID,
    request: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    valid_statuses = ["in_progress", "ready", "delivered"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    status_map = {
        "in_progress": OrderStatus.IN_PROGRESS,
        "ready": OrderStatus.READY,
        "delivered": OrderStatus.DELIVERED,
    }
    order.status = status_map[request.status]
    if request.status == "delivered":
        await db.execute(
            update(OrderItem).where(OrderItem.order_id == order_id).values(status=OrderItemStatus.SERVED)
        )
    await db.commit()
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    items = items_result.scalars().all()
    table_number = await get_table_number(db, order.table_id)
    if request.status == "delivered":
        await broadcast_order_complete(str(order_id), table_number)
    elif request.status == "ready":
        await broadcast_kitchen_update(order, items, table_number, "order_all_ready")
        await ws_manager.broadcast_to_channel(
            {"event": "kitchen:order_ready", "payload": {"order_id": str(order_id), "table_number": table_number}},
            "waiter"
        )
    else:
        await broadcast_kitchen_update(order, items, table_number)
    return {
        "message": f"Order status updated to {request.status}",
        "order_id": str(order_id),
        "status": request.status,
    }


@router.patch("/items/{item_id}/status")
async def update_item_status(
    item_id: UUID,
    request: ItemStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await db.get(OrderItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    order = await db.get(Order, item.order_id)
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Item does not belong to your restaurant")
    valid_statuses = ["pending", "preparing", "ready", "served"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    # Validate transition
    current = item.status.value
    allowed = VALID_ITEM_TRANSITIONS.get(current, [])
    if request.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{request.status}'. Allowed: {allowed}"
        )
    status_map = {
        "pending": OrderItemStatus.PENDING,
        "preparing": OrderItemStatus.PREPARING,
        "ready": OrderItemStatus.READY,
        "served": OrderItemStatus.SERVED,
    }
    item.status = status_map[request.status]
    await db.commit()
    await broadcast_item_update(str(item.order_id), str(item_id), request.status)
    # Auto-complete: check if all items are ready
    if request.status == "ready":
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == item.order_id)
        )
        all_items = items_result.scalars().all()
        all_ready = all(i.status == OrderItemStatus.READY for i in all_items)
        if all_ready:
            tenant = await db.get(Tenant, order.tenant_id)
            kds_cfg = get_kds_config_from_tenant(tenant) if tenant else {}
            if kds_cfg.get("auto_complete_when_ready", True):
                order.status = OrderStatus.READY
                await db.commit()
                table_number = await get_table_number(db, order.table_id)
                await broadcast_kitchen_update(order, all_items, table_number, "order_all_ready")
                msg = f"Todos listos! Mesa {table_number}" if table_number else "Todos listos!"
                await ws_manager.broadcast_to_channel(
                    {"event": "kitchen:order_ready", "payload": {"order_id": str(order.id), "table_number": table_number, "message": msg}},
                    "waiter"
                )
    return {
        "message": f"Item status updated to {request.status}",
        "item_id": str(item_id),
        "status": request.status,
    }


@router.get("/orders", response_model=KDSOrdersResponse)
async def get_kitchen_orders(
    include_statuses: str = Query("in_progress,ready", description="Comma-separated statuses"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_list = [s.strip() for s in include_statuses.split(",")]
    status_map = {
        "open": OrderStatus.OPEN,
        "pending_payment": OrderStatus.PENDING_PAYMENT,
        "in_progress": OrderStatus.IN_PROGRESS,
        "ready": OrderStatus.READY,
        "delivered": OrderStatus.DELIVERED,
    }
    status_enums = [status_map[s] for s in status_list if s in status_map]
    if not status_enums:
        status_enums = [OrderStatus.IN_PROGRESS, OrderStatus.READY]
    # In restaurant mode, also include open orders
    try:
        tenant = await db.get(Tenant, current_user.tenant_id)
        kds_mode = "restaurant"
        if tenant and tenant.features_config:
            kds_mode = tenant.features_config.get("kds", {}).get("mode", "restaurant")
        if kds_mode == "restaurant" and OrderStatus.OPEN not in status_enums:
            status_enums.append(OrderStatus.OPEN)
    except Exception:
        if OrderStatus.OPEN not in status_enums:
            status_enums.append(OrderStatus.OPEN)
    result = await db.execute(
        select(Order)
        .where(and_(Order.tenant_id == current_user.tenant_id, Order.status.in_(status_enums)))
        .options(selectinload(Order.items))
        .order_by(Order.paid_at.asc().nullsfirst(), Order.created_at.asc())
    )
    orders = result.scalars().unique().all()
    # Batch load table numbers
    table_ids = [o.table_id for o in orders if o.table_id]
    tables_map = {}
    if table_ids:
        tables_result = await db.execute(select(Table).where(Table.id.in_(table_ids)))
        for t in tables_result.scalars().all():
            tables_map[t.id] = t.number
    kds_orders = []
    for order in orders:
        tn = tables_map.get(order.table_id, 0) if order.table_id else 0
        kds_orders.append(await build_kds_order(order, order.items, tn))
    return KDSOrdersResponse(orders=kds_orders, total_count=len(kds_orders))


@router.post("/orders/{order_id}/complete")
async def complete_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your restaurant")
    order.status = OrderStatus.DELIVERED
    await db.execute(
        update(OrderItem).where(OrderItem.order_id == order_id).values(status=OrderItemStatus.SERVED)
    )
    await db.commit()
    table_number = await get_table_number(db, order.table_id)
    await broadcast_order_complete(str(order_id), table_number)
    return {"message": "Order completed and delivered", "order_id": str(order_id)}


@router.delete("/orders/{order_id}/complete")
async def complete_order_delete(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Backward compat: DELETE also completes an order."""
    return await complete_order(order_id, db, current_user)
