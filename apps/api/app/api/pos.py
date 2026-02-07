"""
RestoNext MX - POS API Routes
Order management endpoints with real-time WebSocket notifications
"""

from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_waiter, require_cashier, require_onboarding_complete
from app.core.websocket_manager import ws_manager
from app.models.models import (
    User, Order, OrderItem, MenuItem, Table, BillSplit,
    OrderStatus, OrderItemStatus, TableStatus, SplitType
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
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    
    try:
        from uuid import UUID as PyUUID
        
        logger.info(f"Creating order with data: table_id={order_data.table_id}, items_count={len(order_data.items)}")
        
        # Get table - handle string or UUID with proper error handling
        try:
            table_id = order_data.table_uuid
        except (ValueError, AttributeError) as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid table_id format: {order_data.table_id}"
            )
        
        if not table_id:
            raise HTTPException(status_code=400, detail="table_id is required")
        
        table_result = await db.execute(
            select(Table).where(Table.id == table_id)
        )
        table = table_result.scalar_one_or_none()
        
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Create order
        order = Order(
            tenant_id=current_user.tenant_id,
            table_id=table_id,
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
            # Get menu item - convert string to UUID if needed
            try:
                menu_item_id = item_data.menu_item_uuid
            except (ValueError, AttributeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid menu_item_id format: {item_data.menu_item_id}"
                )
            
            menu_result = await db.execute(
                select(MenuItem).where(MenuItem.id == menu_item_id)
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
                prep_time_minutes=getattr(menu_item, 'prep_time_minutes', 15) or 15,
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
                "prep_time_minutes": getattr(menu_item, 'prep_time_minutes', 15) or 15,
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
        
        # Auto-transition to IN_PROGRESS when order has kitchen/bar items
        # This ensures orders immediately appear on the Kitchen Display System
        if kitchen_items or bar_items:
            order.status = OrderStatus.IN_PROGRESS
            logger.info(f"Order {order.id} set to IN_PROGRESS (has {len(kitchen_items)} kitchen + {len(bar_items)} bar items)")
        
        await db.commit()
        await db.refresh(order)
        
        # Load relationships for response
        await db.refresh(order, ["items"])
        
        # Send WebSocket notifications with data matching frontend KDS expectations
        # Frontend expects: id, orderId, tableNumber, items[{id, name, quantity, modifiers, notes, status}], createdAt
        max_kitchen_prep = max((item.get("prep_time_minutes", 15) for item in kitchen_items), default=15)
        max_bar_prep = max((item.get("prep_time_minutes", 15) for item in bar_items), default=15)

        kds_kitchen_items = [
            {
                "id": item["id"],
                "name": item["name"],
                "quantity": item["quantity"],
                "modifiers": [m.get("option_name", str(m)) for m in item.get("modifiers", [])] if item.get("modifiers") else [],
                "notes": item.get("notes"),
                "status": "pending",
                "prep_time_minutes": item.get("prep_time_minutes", 15),
            }
            for item in kitchen_items
        ]
        
        kds_bar_items = [
            {
                "id": item["id"],
                "name": item["name"],
                "quantity": item["quantity"],
                "modifiers": [m.get("option_name", str(m)) for m in item.get("modifiers", [])] if item.get("modifiers") else [],
                "notes": item.get("notes"),
                "status": "pending",
                "prep_time_minutes": item.get("prep_time_minutes", 15),
            }
            for item in bar_items
        ]
        
        order_number = f"#{table.number}-{str(order.id)[:4].upper()}"
        order_notification = {
            "id": str(order.id),
            "orderId": str(order.id),
            "order_id": str(order.id),
            "tableNumber": table.number,
            "table_number": table.number,
            "order_number": order_number,
            "order_source": "pos",
            "status": order.status.value,
            "total": order.total,
            "notes": order.notes,
            "waiter_name": current_user.name,
            "createdAt": order.created_at.isoformat(),
            "created_at": order.created_at.isoformat(),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        }
        
        if kitchen_items:
            await ws_manager.notify_kitchen_new_order({
                **order_notification,
                "items": kds_kitchen_items,
                "max_prep_time_minutes": max_kitchen_prep,
            })
            logger.info(f"Sent kitchen WebSocket notification for order {order.id} with {len(kds_kitchen_items)} items")
        
        if bar_items:
            await ws_manager.notify_bar_new_order({
                **order_notification,
                "items": kds_bar_items,
                "max_prep_time_minutes": max_bar_prep,
            })
        
        return order
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the full exception with traceback
        logger.error(f"Error creating order: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


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
        .options(selectinload(Order.items), selectinload(Order.table))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    data = OrderResponse.model_validate(order)
    if order.table:
        data.table_number = order.table.number
    return data


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
    ).options(selectinload(Order.items), selectinload(Order.table))
    
    if status:
        status_list = status.split(',')
        if len(status_list) > 1:
            query = query.where(Order.status.in_(status_list))
        else:
            query = query.where(Order.status == status)
    
    if table_id:
        query = query.where(Order.table_id == table_id)
    
    query = query.order_by(Order.created_at.desc())
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    # Enrich with table_number for frontend display
    response = []
    for o in orders:
        data = OrderResponse.model_validate(o)
        if o.table:
            data.table_number = o.table.number
        response.append(data)
    return response


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
            order.paid_at = datetime.utcnow()
    else:
        # Full payment
        order.status = OrderStatus.PAID
        order.paid_at = datetime.utcnow()
    
    # Free up the table
    if order.status == OrderStatus.PAID:
        table_result = await db.execute(
            select(Table).where(Table.id == order.table_id)
        )
        table = table_result.scalar_one_or_none()
        if table:
            table.status = TableStatus.FREE
            
        # Trigger inventory deduction
        try:
            from app.services.inventory_service import process_order_inventory
            await process_order_inventory(
                db=db, 
                order_id=order.id, 
                user_id=current_user.id,
                allow_negative_stock=True
            )
        except Exception as e:
            # Don't fail the request if inventory fails, just log it
            print(f"ERROR: Inventory deduction failed for order {order.id}: {e}")
        
        # Award loyalty points if customer is linked
        if order.customer_id:
            try:
                from app.services.loyalty_service import LoyaltyService
                loyalty = LoyaltyService(db=db, tenant_id=current_user.tenant_id)
                await loyalty.add_points_from_order(
                    customer_id=order.customer_id,
                    order_id=order.id,
                    amount=float(order.total or 0)
                )
            except Exception as e:
                print(f"WARNING: Loyalty points failed for order {order.id}: {e}")
    
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


# ============================================
# Cafeteria Order Endpoint
# ============================================

from pydantic import BaseModel, Field
from typing import Optional, List as TypingList
from datetime import datetime

class CafeteriaOrderItem(BaseModel):
    menu_item_id: str
    quantity: int = 1
    notes: Optional[str] = None

class CafeteriaOrderCreate(BaseModel):
    items: TypingList[CafeteriaOrderItem]
    payment_method: str = Field("cash", description="'cash', 'card', or 'transfer'")
    total: float = 0

@router.post("/cafeteria", status_code=status.HTTP_201_CREATED)
async def create_cafeteria_order(
    order_data: CafeteriaOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_cashier),
):
    """
    Create an order in cafeteria mode (already paid).
    
    This endpoint:
    1. Creates the order
    2. Marks it as paid (IN_PROGRESS status)
    3. Sends it directly to kitchen display
    
    Requires no table selection - uses a default "counter" table.
    """
    from uuid import UUID as PyUUID
    
    # Get or create a counter/takeout table for this tenant
    counter_table_result = await db.execute(
        select(Table).where(
            Table.tenant_id == current_user.tenant_id,
            Table.number == 0  # Convention: table 0 is counter/takeout
        )
    )
    counter_table = counter_table_result.scalar_one_or_none()
    
    if not counter_table:
        # Create counter table if it doesn't exist
        counter_table = Table(
            tenant_id=current_user.tenant_id,
            number=0,
            capacity=1,
            zone="counter",
            status=TableStatus.FREE,
        )
        db.add(counter_table)
        await db.flush()
    
    # Create order with IN_PROGRESS status (already paid, ready for kitchen)
    order = Order(
        tenant_id=current_user.tenant_id,
        table_id=counter_table.id,
        waiter_id=current_user.id,
        status=OrderStatus.IN_PROGRESS,  # Directly to kitchen
        paid_at=datetime.utcnow(),
        notes=f"Cafetería - {order_data.payment_method}",
    )
    db.add(order)
    await db.flush()
    
    # Process items
    subtotal = 0.0
    kitchen_items = []
    
    for item_data in order_data.items:
        # Get menu item
        try:
            menu_item_id = PyUUID(item_data.menu_item_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid menu_item_id format: {item_data.menu_item_id}"
            )
        
        menu_result = await db.execute(
            select(MenuItem).where(MenuItem.id == menu_item_id)
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
        
        unit_price = menu_item.price
        
        # Create order item
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            menu_item_name=menu_item.name,
            route_to=menu_item.route_to,
            quantity=item_data.quantity,
            unit_price=unit_price,
            selected_modifiers=[],
            notes=item_data.notes,
            status=OrderItemStatus.PENDING,
            prep_time_minutes=getattr(menu_item, 'prep_time_minutes', 15) or 15,
        )
        db.add(order_item)
        
        item_total = unit_price * item_data.quantity
        subtotal += item_total
        
        # Add to kitchen notification
        kitchen_items.append({
            "id": str(order_item.id),
            "name": menu_item.name,
            "quantity": item_data.quantity,
            "notes": item_data.notes,
            "table_number": 0,
            "prep_time_minutes": getattr(menu_item, 'prep_time_minutes', 15) or 15,
        })
    
    # Calculate totals
    tax = subtotal * 0.16  # IVA 16%
    total = subtotal + tax
    
    order.subtotal = subtotal
    order.tax = tax
    order.total = total
    
    await db.commit()
    await db.refresh(order)
    
    # Send to kitchen via WebSocket (include both camelCase and snake_case for frontend compatibility)
    if kitchen_items:
        max_cafe_prep = max((item.get("prep_time_minutes", 15) for item in kitchen_items), default=15)
        kds_items = [
            {
                "id": item["id"],
                "name": item["name"],
                "quantity": item["quantity"],
                "modifiers": [],
                "notes": item.get("notes"),
                "status": "pending",
                "prep_time_minutes": item.get("prep_time_minutes", 15),
            }
            for item in kitchen_items
        ]
        order_notification = {
            "id": str(order.id),
            "orderId": str(order.id),
            "order_id": str(order.id),
            "tableNumber": 0,
            "table_number": 0,
            "order_number": f"#C-{str(order.id)[:4].upper()}",
            "order_source": "pos",
            "status": order.status.value,
            "total": order.total,
            "notes": order.notes,
            "waiter_name": current_user.name,
            "createdAt": order.created_at.isoformat(),
            "created_at": order.created_at.isoformat(),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "items": kds_items,
            "max_prep_time_minutes": max_cafe_prep,
            "is_cafeteria": True,
        }
        await ws_manager.notify_kitchen_new_order(order_notification)
        
    # Trigger inventory deduction for cafeteria (IN_PROGRESS)
    try:
        from app.services.inventory_service import process_order_inventory
        await process_order_inventory(
            db=db, 
            order_id=order.id, 
            user_id=current_user.id,
            allow_negative_stock=True
        )
    except Exception as e:
        print(f"ERROR: Inventory deduction failed for cafeteria order {order.id}: {e}")
    
    return {
        "success": True,
        "message": "Pedido creado y enviado a cocina",
        "order_id": str(order.id),
        "total": total,
        "status": "in_progress",
    }


# ============================================
# Bill Split Endpoints (Persistent Splits)
# ============================================

@router.get("/{order_id}/splits", response_model=BillSplitResponse)
async def get_order_splits(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current bill split configuration for an order.
    Returns 404 if no splits have been saved yet.
    """
    result = await db.execute(
        select(BillSplit).where(BillSplit.order_id == order_id)
    )
    bill_split = result.scalar_one_or_none()
    
    if not bill_split:
        raise HTTPException(
            status_code=404, 
            detail="No splits configured for this order"
        )
    
    return bill_split


@router.post("/{order_id}/splits", response_model=BillSplitResponse)
async def save_order_splits(
    order_id: UUID,
    split_data: BillSplitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save or update the bill split configuration for an order.
    If a split already exists, it will be updated (upsert behavior).
    """
    # Verify order exists
    order_result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check for existing split
    result = await db.execute(
        select(BillSplit).where(BillSplit.order_id == order_id)
    )
    bill_split = result.scalar_one_or_none()
    
    # Convert splits to dict format for JSONB
    splits_data = [s.model_dump() for s in split_data.splits]
    
    if bill_split:
        # Update existing split
        bill_split.split_type = SplitType(split_data.split_type)
        bill_split.splits = splits_data
    else:
        # Create new split
        bill_split = BillSplit(
            order_id=order_id,
            split_type=SplitType(split_data.split_type),
            splits=splits_data
        )
        db.add(bill_split)
    
    await db.commit()
    await db.refresh(bill_split)
    
    return bill_split


@router.delete("/{order_id}/splits")
async def delete_order_splits(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the bill split configuration for an order."""
    result = await db.execute(
        select(BillSplit).where(BillSplit.order_id == order_id)
    )
    bill_split = result.scalar_one_or_none()
    
    if not bill_split:
        raise HTTPException(status_code=404, detail="No splits found")
    
    await db.delete(bill_split)
    await db.commit()
    
    return {"status": "deleted"}

