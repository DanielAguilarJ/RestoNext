"""
RestoNext MX - POS API Routes
Order management endpoints with real-time WebSocket notifications
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_waiter, require_cashier, require_onboarding_complete
from app.core.websocket_manager import ws_manager
from app.models.models import (
    User, Order, OrderItem, MenuItem, Table, 
    OrderStatus, OrderItemStatus, TableStatus
)
from app.schemas.schemas import (
    OrderCreate, OrderResponse, OrderItemResponse,
    PartialPaymentRequest, BillSplitCreate, BillSplitResponse
)

router = APIRouter(prefix="/orders", tags=["POS - Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_waiter),
    _: bool = Depends(require_onboarding_complete),
):
    """
    Create a new order.
    
    Triggers WebSocket event `kitchen:new_order` for KDS displays.
    Bar items are routed separately to `bar:new_order`.
    """
    # Get table
    table_result = await db.execute(
        select(Table).where(Table.id == order_data.table_id)
    )
    table = table_result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Create order
    order = Order(
        tenant_id=current_user.tenant_id,
        table_id=order_data.table_id,
        waiter_id=current_user.id,
        status=OrderStatus.OPEN,
        notes=order_data.notes,
    )
    db.add(order)
    await db.flush()  # Get order ID
    
    # Process items
    subtotal = 0.0
    kitchen_items = []
    bar_items = []
    
    for item_data in order_data.items:
        # Get menu item
        menu_result = await db.execute(
            select(MenuItem).where(MenuItem.id == item_data.menu_item_id)
        )
        menu_item = menu_result.scalar_one_or_none()
        
        if not menu_item:
            raise HTTPException(
                status_code=404, 
                detail=f"Menu item {item_data.menu_item_id} not found"
            )
        
        if not menu_item.is_available:
            raise HTTPException(
                status_code=400,
                detail=f"{menu_item.name} is not available"
            )
        
        # Calculate price with modifiers
        unit_price = menu_item.price
        for modifier in item_data.selected_modifiers:
            unit_price += modifier.price_delta
        
        # Create order item
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            menu_item_name=menu_item.name,
            route_to=menu_item.route_to,
            quantity=item_data.quantity,
            unit_price=unit_price,
            selected_modifiers=[m.model_dump() for m in item_data.selected_modifiers],
            seat_number=item_data.seat_number,
            notes=item_data.notes,
            status=OrderItemStatus.PENDING,
        )
        db.add(order_item)
        
        item_total = unit_price * item_data.quantity
        subtotal += item_total
        
        # Route to appropriate display
        item_dict = {
            "id": str(order_item.id),
            "name": menu_item.name,
            "quantity": item_data.quantity,
            "modifiers": [m.model_dump() for m in item_data.selected_modifiers],
            "notes": item_data.notes,
            "table_number": table.number,
        }
        
        if menu_item.route_to.value == "bar":
            bar_items.append(item_dict)
        else:
            kitchen_items.append(item_dict)
    
    # Calculate totals
    tax = subtotal * 0.16  # IVA 16%
    total = subtotal + tax
    
    order.subtotal = subtotal
    order.tax = tax
    order.total = total
    
    # Update table status
    table.status = TableStatus.OCCUPIED
    
    await db.commit()
    await db.refresh(order)
    
    # Load relationships for response
    await db.refresh(order, ["items"])
    
    # Send WebSocket notifications
    order_notification = {
        "order_id": str(order.id),
        "table_number": table.number,
        "waiter_name": current_user.name,
        "created_at": order.created_at.isoformat(),
    }
    
    if kitchen_items:
        await ws_manager.notify_kitchen_new_order({
            **order_notification,
            "items": kitchen_items,
        })
    
    if bar_items:
        await ws_manager.notify_bar_new_order({
            **order_notification,
            "items": bar_items,
        })
    
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get order by ID with all items"""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


@router.get("", response_model=List[OrderResponse])
async def list_orders(
    status: str = None,
    table_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders with optional filters"""
    query = select(Order).where(
        Order.tenant_id == current_user.tenant_id
    ).options(selectinload(Order.items))
    
    if status:
        query = query.where(Order.status == status)
    
    if table_id:
        query = query.where(Order.table_id == table_id)
    
    query = query.order_by(Order.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{order_id}/items/{item_id}/status")
async def update_item_status(
    order_id: UUID,
    item_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update order item status (for kitchen/bar staff).
    
    When status changes to 'ready', notifies waiters via WebSocket.
    """
    result = await db.execute(
        select(OrderItem)
        .where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    item.status = OrderItemStatus(new_status)
    await db.commit()
    
    # Notify waiter when item is ready
    if new_status == "ready":
        await ws_manager.notify_kitchen_item_ready({
            "order_id": str(order_id),
            "item_id": str(item_id),
            "item_name": item.menu_item_name,
        })
    
    return {"status": "updated", "new_status": new_status}


@router.post("/{order_id}/pay")
async def process_payment(
    order_id: UUID,
    payment: PartialPaymentRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_cashier),
):
    """
    Process payment for an order.
    
    Supports:
    - Full payment (no payment body)
    - Partial payment for split checks (with split_number)
    """
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.bill_splits))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if payment:
        # Partial payment for split check
        for split in order.bill_splits:
            if split.splits:
                for s in split.splits:
                    if s.get("split_number") == payment.split_number:
                        s["paid"] = True
                        s["payment_method"] = payment.payment_method
        
        # Check if all splits are paid
        all_paid = all(
            s.get("paid", False) 
            for bs in order.bill_splits 
            for s in bs.splits
        )
        
        if all_paid:
            order.status = OrderStatus.PAID
    else:
        # Full payment
        order.status = OrderStatus.PAID
    
    # Free up the table
    if order.status == OrderStatus.PAID:
        table_result = await db.execute(
            select(Table).where(Table.id == order.table_id)
        )
        table = table_result.scalar_one_or_none()
        if table:
            table.status = TableStatus.FREE
    
    await db.commit()
    
    return {
        "status": "success",
        "order_status": order.status.value,
        "message": "Payment processed successfully"
    }


@router.post("/{order_id}/request-bill")
async def request_bill(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark table as bill requested (changes table color to yellow)"""
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update table status
    table_result = await db.execute(
        select(Table).where(Table.id == order.table_id)
    )
    table = table_result.scalar_one_or_none()
    
    if table:
        table.status = TableStatus.BILL_REQUESTED
    
    await db.commit()
    
    return {"status": "bill_requested"}
