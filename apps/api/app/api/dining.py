"""
RestoNext MX - Auto-Service / Dining API Router
Public endpoints for customer self-ordering via tablets/QR codes

SECURITY MODEL:
- No user authentication required
- Access controlled via Table Token (qr_secret_token)
- Token validated via query parameter or header
- Tenant must have 'self_service' add-on enabled

URL Pattern: /dining/{tenant_id}/table/{table_id}?token={qr_secret_token}
"""

import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.websocket_manager import ws_manager
from app.core.rate_limiter import RateLimiter, get_service_request_limiter, get_bill_request_limiter
from app.core.permissions import Feature, has_feature
from app.models.models import (
    Tenant, Table, TableStatus, 
    Order, OrderItem, OrderStatus, OrderSource, OrderItemStatus,
    MenuCategory, MenuItem,
    ServiceRequest, ServiceRequestType, ServiceRequestStatus,
    User
)
from app.schemas.dining_schemas import (
    PublicMenuResponse, MenuCategoryPublic, MenuItemPublic, ModifierGroupPublic, ModifierOptionPublic,
    DiningOrderCreate, DiningOrderResponse, DiningOrderItemResponse,
    ServiceRequestCreate, ServiceRequestResponse, ActiveServiceRequests,
    TableSessionInfo, TableTokenValidation,
    BillPublic, BillItemPublic, BillRequestResponse,
    OrderStatusPublic,
    UpsellRequest, UpsellResponse, UpsellSuggestion
)
from app.services.ai_service import AIService


router = APIRouter(prefix="/dining", tags=["Self-Service Dining"])


# ============================================
# Table Token Security Dependency
# ============================================

class TableContext:
    """Context object passed to endpoints after token validation"""
    def __init__(self, tenant: Tenant, table: Table):
        self.tenant = tenant
        self.table = table
        self.tenant_id = tenant.id
        self.table_id = table.id
        self.table_number = table.number


async def get_current_table(
    tenant_id: str,
    table_id: str,
    token: str = Query(..., description="QR secret token for table access"),
    db: AsyncSession = Depends(get_db)
) -> TableContext:
    """
    Validate table token and return table context.
    
    This is the core security mechanism for self-service ordering:
    1. Validates the tenant exists and has self_service add-on enabled
    2. Validates the table exists and belongs to the tenant
    3. Validates the QR token matches the table's current token
    4. Validates self-service is enabled for this specific table
    
    SECURITY NOTES:
    - Token rotation happens when table is cleared
    - Old tokens become invalid immediately
    - Rate limiting should be applied at API gateway level
    """
    try:
        tenant_uuid = uuid.UUID(tenant_id)
        table_uuid = uuid.UUID(table_id)
        token_uuid = uuid.UUID(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format"
        )
    
    # Fetch tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_uuid)
    )
    tenant = tenant_result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restaurant is currently unavailable"
        )
    
    # Check if self_service add-on is enabled
    addons = tenant.active_addons or {}
    if not addons.get("self_service", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-service ordering is not available at this restaurant"
        )
    
    # Fetch table
    table_result = await db.execute(
        select(Table).where(
            and_(
                Table.id == table_uuid,
                Table.tenant_id == tenant_uuid
            )
        )
    )
    table = table_result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Validate token
    if table.qr_secret_token != token_uuid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired table access code. Please scan the QR code again."
        )
    
    # Check if self-service is enabled for this table
    if not table.self_service_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-service is disabled for this table. Please ask a waiter for assistance."
        )
    
    return TableContext(tenant=tenant, table=table)


def require_addon(addon_name: str):
    """
    Dependency factory to check if a specific add-on is enabled.
    Use this for optional features within self-service.
    """
    async def addon_checker(ctx: TableContext = Depends(get_current_table)) -> TableContext:
        addons = ctx.tenant.active_addons or {}
        if not addons.get(addon_name, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires the {addon_name} module"
            )
        return ctx
    return addon_checker


# ============================================
# Public Menu Endpoints
# ============================================

@router.get("/{tenant_id}/table/{table_id}/menu", response_model=PublicMenuResponse)
async def get_public_menu(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the full menu optimized for customer view.
    
    Features:
    - Large images for tablet display
    - AI-enhanced descriptions (if available)
    - Only shows available items
    - Includes modifier options with prices
    """
    # Fetch all active categories with their items
    result = await db.execute(
        select(MenuCategory)
        .where(
            and_(
                MenuCategory.tenant_id == ctx.tenant_id,
                MenuCategory.is_active == True
            )
        )
        .options(selectinload(MenuCategory.items))
        .order_by(MenuCategory.sort_order)
    )
    categories = result.scalars().all()
    
    # Build public menu response
    public_categories = []
    for cat in categories:
        # Filter only available items
        available_items = [
            item for item in cat.items 
            if item.is_available
        ]
        
        if not available_items:
            continue
        
        public_items = []
        for item in sorted(available_items, key=lambda x: x.sort_order):
            # Parse modifiers schema if exists
            modifiers = None
            if item.modifiers_schema:
                groups = item.modifiers_schema.get("groups", [])
                modifiers = [
                    ModifierGroupPublic(
                        name=g.get("name", ""),
                        required=g.get("required", False),
                        min_select=g.get("min_select"),
                        max_select=g.get("max_select"),
                        options=[
                            ModifierOptionPublic(
                                id=o.get("id", ""),
                                name=o.get("name", ""),
                                price_delta=o.get("price_delta", 0)
                            )
                            for o in g.get("options", [])
                        ]
                    )
                    for g in groups
                ]
            
            public_items.append(MenuItemPublic(
                id=item.id,
                name=item.name,
                description=item.description,
                price=item.price,
                image_url=item.image_url,
                is_available=item.is_available,
                modifiers=modifiers,
                tags=[]  # TODO: Add dietary tags field to MenuItem
            ))
        
        public_categories.append(MenuCategoryPublic(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            items=public_items
        ))
    
    # Get feature config for display options
    features_config = ctx.tenant.features_config or {}
    self_service_config = features_config.get("self_service", {})
    
    return PublicMenuResponse(
        restaurant_name=ctx.tenant.trade_name or ctx.tenant.name,
        logo_url=ctx.tenant.logo_url,
        table_number=ctx.table_number,
        categories=public_categories,
        currency=ctx.tenant.currency,
        allow_special_requests=self_service_config.get("allow_special_requests", True),
        show_prices=self_service_config.get("show_prices", True)
    )


# ============================================
# Order Management Endpoints
# ============================================

@router.post("/{tenant_id}/table/{table_id}/order", response_model=DiningOrderResponse)
async def create_dining_order(
    order_data: DiningOrderCreate,
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new order from the self-service tablet.
    
    Flow:
    1. Validate all menu items exist and are available
    2. Calculate totals with modifiers
    3. Create order with order_source='self_service'
    4. Mark table as occupied
    5. Send WebSocket notification to KDS and POS
    6. Return order confirmation
    """
    # Get or find a system user for self-service orders
    # In a real implementation, you'd have a dedicated "self-service" user
    system_user_result = await db.execute(
        select(User).where(
            and_(
                User.tenant_id == ctx.tenant_id,
                User.is_active == True
            )
        ).limit(1)
    )
    system_user = system_user_result.scalar_one_or_none()
    
    if not system_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Restaurant configuration error. Please contact staff."
        )
    
    # Fetch all requested menu items
    menu_item_ids = [item.menu_item_id for item in order_data.items]
    result = await db.execute(
        select(MenuItem).where(
            and_(
                MenuItem.id.in_(menu_item_ids),
                MenuItem.is_available == True
            )
        )
    )
    menu_items = {item.id: item for item in result.scalars().all()}
    
    # Validate all items exist
    for item in order_data.items:
        if item.menu_item_id not in menu_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Menu item not available"
            )
    
    # Check for existing open order on this table
    existing_order_result = await db.execute(
        select(Order).where(
            and_(
                Order.table_id == ctx.table_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS])
            )
        ).order_by(Order.created_at.desc())
    )
    existing_order = existing_order_result.scalars().first()
    
    if existing_order:
        # Add items to existing order
        order = existing_order
    else:
        # Create new order
        order = Order(
            tenant_id=ctx.tenant_id,
            table_id=ctx.table_id,
            waiter_id=system_user.id,  # Assigned to system/self-service user
            status=OrderStatus.OPEN,
            order_source=OrderSource.SELF_SERVICE,
            service_type="dine_in",
            notes=order_data.notes
        )
        db.add(order)
        await db.flush()  # Get order.id
    
    # Create order items
    subtotal = 0.0
    order_items = []
    
    for item_data in order_data.items:
        menu_item = menu_items[item_data.menu_item_id]
        
        # Calculate item price with modifiers
        item_price = menu_item.price
        modifiers_list = []
        
        for mod in item_data.selected_modifiers:
            item_price += mod.price_delta
            modifiers_list.append({
                "group_name": mod.group_name,
                "option_id": mod.option_id,
                "option_name": mod.option_name,
                "price_delta": mod.price_delta
            })
        
        item_subtotal = item_price * item_data.quantity
        subtotal += item_subtotal
        
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            menu_item_name=menu_item.name,
            route_to=menu_item.route_to,
            quantity=item_data.quantity,
            unit_price=item_price,
            selected_modifiers=modifiers_list,
            notes=item_data.notes,
            status=OrderItemStatus.PENDING,
            prep_time_minutes=getattr(menu_item, 'prep_time_minutes', 15) or 15,
        )
        db.add(order_item)
        order_items.append(order_item)
    
    # Calculate totals (16% IVA for Mexico)
    tax_rate = 0.16
    tax = subtotal * tax_rate
    total = subtotal + tax
    
    # Update order totals
    order.subtotal = (order.subtotal or 0) + subtotal
    order.tax = (order.tax or 0) + tax
    order.total = (order.total or 0) + total
    order.status = OrderStatus.IN_PROGRESS
    
    # Update table status
    ctx.table.status = TableStatus.OCCUPIED
    
    await db.commit()
    await db.refresh(order)
    
    # Prepare WebSocket notification
    # Build items with modifiers flattened to string arrays for KDS compatibility
    ws_items = []
    max_prep = 15
    for oi in order_items:
        prep = getattr(oi, 'prep_time_minutes', 15) or 15
        if prep > max_prep:
            max_prep = prep
        # Flatten modifiers: [{group_name, option_name, ...}] -> ["option_name", ...]
        mods = []
        if oi.selected_modifiers:
            for m in oi.selected_modifiers:
                if isinstance(m, dict):
                    mods.append(m.get("option_name", str(m)))
                else:
                    mods.append(str(m))
        ws_items.append({
            "id": str(oi.id),
            "name": oi.menu_item_name,
            "quantity": oi.quantity,
            "modifiers": mods,
            "notes": oi.notes,
            "status": "pending",
            "route_to": oi.route_to.value if hasattr(oi.route_to, 'value') else str(oi.route_to),
            "prep_time_minutes": prep,
        })

    order_number = f"#{ctx.table_number}-{str(order.id)[:4].upper()}"
    ws_payload = {
        "id": str(order.id),
        "order_id": str(order.id),
        "table_number": ctx.table_number,
        "order_number": order_number,
        "order_source": "self_service",
        "status": order.status.value,
        "total": order.total,
        "notes": order.notes,
        "items": ws_items,
        "max_prep_time_minutes": max_prep,
        "created_at": datetime.utcnow().isoformat(),
        "paid_at": None,
    }
    
    # Notify KDS (Kitchen Display System)
    await ws_manager.notify_kitchen_new_order(ws_payload)
    
    # Notify POS/Waiter stations
    await ws_manager.broadcast_to_channel({
        "event": "table:new_self_service_order",
        "payload": {
            "table_number": ctx.table_number,
            "table_id": str(ctx.table_id),
            "order_id": str(order.id),
            "order_total": order.total,
            "items_count": len(order_items)
        }
    }, "waiter")
    
    # Build response
    return DiningOrderResponse(
        id=order.id,
        order_number=f"#{ctx.table_number}-{str(order.id)[:4].upper()}",
        table_number=ctx.table_number,
        status=order.status.value,
        items=[
            DiningOrderItemResponse(
                id=oi.id,
                menu_item_name=oi.menu_item_name,
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                modifiers=oi.selected_modifiers or [],
                notes=oi.notes,
                status=oi.status.value
            )
            for oi in order_items
        ],
        subtotal=subtotal,
        tax=tax,
        total=total,
        estimated_time_minutes=max((getattr(oi, 'prep_time_minutes', 15) or 15 for oi in order_items), default=15),
        created_at=order.created_at
    )


@router.get("/{tenant_id}/table/{table_id}/order/status", response_model=OrderStatusPublic)
async def get_order_status(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time status of the current order.
    Customers can track which items are being prepared vs ready.
    """
    # Find current order for this table (most recent)
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.table_id == ctx.table_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY])
            )
        )
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active order found for this table"
        )
    
    items_status = [
        {
            "name": item.menu_item_name,
            "quantity": item.quantity,
            "status": item.status.value,
            "ready_at": None  # TODO: Track ready timestamp
        }
        for item in order.items
    ]
    
    return OrderStatusPublic(
        order_id=order.id,
        status=order.status.value,
        items=items_status,
        estimated_ready_at=None  # TODO: Calculate based on item statuses
    )


# ============================================
# Service Request Endpoints
# ============================================

@router.post("/{tenant_id}/table/{table_id}/service-request", response_model=ServiceRequestResponse)
async def create_service_request(
    request_data: ServiceRequestCreate,
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(get_service_request_limiter())
):

    """
    Create a service request (call waiter, request bill, etc.)
    
    Types:
    - waiter: General assistance
    - bill: Request the check
    - refill: Request drink refill
    - custom: Custom message to staff
    """
    # Map string type to enum
    request_type_map = {
        "waiter": ServiceRequestType.WAITER,
        "bill": ServiceRequestType.BILL,
        "refill": ServiceRequestType.REFILL,
        "custom": ServiceRequestType.CUSTOM
    }
    
    request_type = request_type_map.get(request_data.request_type)
    if not request_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request type"
        )
    
    # Check for duplicate pending requests of same type
    existing_result = await db.execute(
        select(ServiceRequest).where(
            and_(
                ServiceRequest.table_id == ctx.table_id,
                ServiceRequest.request_type == request_type,
                ServiceRequest.status == ServiceRequestStatus.PENDING
            )
        ).order_by(ServiceRequest.created_at.desc())
    )
    existing = existing_result.scalars().first()
    
    if existing:
        # Return existing request instead of creating duplicate
        return ServiceRequestResponse(
            id=existing.id,
            request_type=existing.request_type.value,
            status=existing.status.value,
            message=existing.message,
            created_at=existing.created_at,
            estimated_response_minutes=2
        )
    
    # Create new service request
    service_request = ServiceRequest(
        tenant_id=ctx.tenant_id,
        table_id=ctx.table_id,
        request_type=request_type,
        status=ServiceRequestStatus.PENDING,
        message=request_data.message
    )
    db.add(service_request)
    await db.commit()
    await db.refresh(service_request)
    
    # Notify POS/Waiter via WebSocket
    await ws_manager.broadcast_to_channel({
        "event": "service_request:new",
        "payload": {
            "id": str(service_request.id),
            "table_number": ctx.table_number,
            "table_id": str(ctx.table_id),
            "request_type": request_type.value,
            "message": request_data.message,
            "created_at": service_request.created_at.isoformat()
        }
    }, "waiter")
    
    # Also notify call_waiter channel for backward compatibility
    if request_type == ServiceRequestType.WAITER:
        await ws_manager.notify_call_waiter(ctx.table_number, str(ctx.tenant_id))
    
    # If bill requested, also update table status
    if request_type == ServiceRequestType.BILL:
        ctx.table.status = TableStatus.BILL_REQUESTED
        await db.commit()
    
    return ServiceRequestResponse(
        id=service_request.id,
        request_type=service_request.request_type.value,
        status=service_request.status.value,
        message=service_request.message,
        created_at=service_request.created_at,
        estimated_response_minutes=2  # TODO: Calculate based on staff availability
    )


@router.get("/{tenant_id}/table/{table_id}/service-requests", response_model=ActiveServiceRequests)
async def get_active_service_requests(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """Get all active (non-resolved) service requests for this table."""
    result = await db.execute(
        select(ServiceRequest).where(
            and_(
                ServiceRequest.table_id == ctx.table_id,
                ServiceRequest.status != ServiceRequestStatus.RESOLVED
            )
        ).order_by(ServiceRequest.created_at.desc())
    )
    requests = result.scalars().all()
    
    return ActiveServiceRequests(
        requests=[
            ServiceRequestResponse(
                id=req.id,
                request_type=req.request_type.value,
                status=req.status.value,
                message=req.message,
                created_at=req.created_at
            )
            for req in requests
        ],
        has_pending=any(req.status == ServiceRequestStatus.PENDING for req in requests)
    )


# ============================================
# Bill / Check Endpoints
# ============================================

@router.get("/{tenant_id}/table/{table_id}/bill", response_model=BillPublic)
async def get_current_bill(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current bill/check for this table.
    Shows all items ordered with totals.
    """
    # Find all orders for this table (could be multiple if items added over time)
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.table_id == ctx.table_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY, OrderStatus.DELIVERED])
            )
        )
        .options(selectinload(Order.items))
    )
    orders = result.scalars().all()
    
    if not orders:
        return BillPublic(
            table_number=ctx.table_number,
            items=[],
            subtotal=0,
            tax=0,
            total=0,
            currency=ctx.tenant.currency
        )
    
    # Aggregate all items from all orders
    bill_items = []
    subtotal = 0.0
    
    for order in orders:
        for item in order.items:
            modifiers_total = sum(
                m.get("price_delta", 0) for m in (item.selected_modifiers or [])
            )
            item_subtotal = item.unit_price * item.quantity
            
            bill_items.append(BillItemPublic(
                name=item.menu_item_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                modifiers_total=modifiers_total,
                subtotal=item_subtotal
            ))
            subtotal += item_subtotal
    
    tax = subtotal * 0.16  # IVA
    total = subtotal + tax
    
    # Get payment config from tenant features
    features_config = ctx.tenant.features_config or {}
    payment_config = features_config.get("payments", {})
    
    return BillPublic(
        table_number=ctx.table_number,
        items=bill_items,
        subtotal=subtotal,
        tax=tax,
        total=total,
        currency=ctx.tenant.currency,
        can_pay_online=payment_config.get("online_enabled", False),
        payment_methods=payment_config.get("methods", ["cash", "card"])
    )


@router.post("/{tenant_id}/table/{table_id}/request-bill", response_model=BillRequestResponse)
async def request_bill(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(get_bill_request_limiter())
):
    """
    Request the bill / check for the table.
    
    CRITICAL ENDPOINT for closing the service cycle:
    1. Validates there are active orders to bill
    2. Calculates complete total with tax breakdown
    3. Changes table status to 'bill_requested'
    4. Creates a bill service request for tracking
    5. Sends HIGH PRIORITY WebSocket notification to:
       - waiter channel
       - cashier channel  
       - pos channel
    6. Returns full bill breakdown so tablet can display "Tu total es $X"
    
    Rate limited to prevent spam (2 requests per 5 minutes).
    """
    # Find all active orders for this table
    result = await db.execute(
        select(Order)
        .where(
            and_(
                Order.table_id == ctx.table_id,
                Order.status.in_([
                    OrderStatus.OPEN, 
                    OrderStatus.IN_PROGRESS, 
                    OrderStatus.READY, 
                    OrderStatus.DELIVERED
                ])
            )
        )
        .options(selectinload(Order.items))
    )
    orders = result.scalars().all()
    
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay consumo para cobrar. Tu mesa no tiene pedidos activos."
        )
    
    # Calculate bill totals
    bill_items = []
    subtotal = 0.0
    
    for order in orders:
        for item in order.items:
            modifiers_total = sum(
                m.get("price_delta", 0) for m in (item.selected_modifiers or [])
            )
            item_subtotal = item.unit_price * item.quantity
            
            bill_items.append(BillItemPublic(
                name=item.menu_item_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                modifiers_total=modifiers_total,
                subtotal=item_subtotal
            ))
            subtotal += item_subtotal
    
    # Calculate tax and totals
    tax_rate = 0.16  # IVA Mexico
    tax = subtotal * tax_rate
    tip_suggested = subtotal * 0.15  # 15% suggested tip
    total = subtotal + tax
    
    # Change table status to bill_requested
    ctx.table.status = TableStatus.BILL_REQUESTED
    
    # Create or update service request for bill
    existing_request = await db.execute(
        select(ServiceRequest).where(
            and_(
                ServiceRequest.table_id == ctx.table_id,
                ServiceRequest.request_type == ServiceRequestType.BILL,
                ServiceRequest.status == ServiceRequestStatus.PENDING
            )
        ).order_by(ServiceRequest.created_at.desc())
    )
    existing = existing_request.scalars().first()
    
    request_timestamp = datetime.utcnow()
    
    if not existing:
        # Create new bill request
        service_request = ServiceRequest(
            tenant_id=ctx.tenant_id,
            table_id=ctx.table_id,
            request_type=ServiceRequestType.BILL,
            status=ServiceRequestStatus.PENDING,
            message=f"Total: ${total:,.2f}"
        )
        db.add(service_request)
    else:
        request_timestamp = existing.created_at
    
    await db.commit()
    
    # CRITICAL: Send WebSocket notification to waiter/cashier/POS
    await ws_manager.notify_bill_requested(
        table_id=str(ctx.table_id),
        table_number=ctx.table_number,
        tenant_id=str(ctx.tenant_id),
        total=total,
        subtotal=subtotal,
        tax=tax,
        items_count=len(bill_items),
        currency=ctx.tenant.currency,
        order_id=str(orders[0].id) if orders else None
    )
    
    return BillRequestResponse(
        success=True,
        table_number=ctx.table_number,
        table_id=ctx.table_id,
        message=f"Tu cuenta es de {ctx.tenant.currency} ${total:,.2f}. Un mesero viene en camino.",
        items=bill_items,
        subtotal=subtotal,
        tax=tax,
        discount=0,
        tip_suggested=tip_suggested,
        total=total,
        currency=ctx.tenant.currency,
        status="payment_requested",
        estimated_wait_minutes=2,
        requested_at=request_timestamp
    )


# ============================================
# Session / Validation Endpoints
# ============================================


@router.get("/{tenant_id}/table/{table_id}/session", response_model=TableSessionInfo)
async def get_table_session(
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Get session information for the table.
    Used by the tablet app to initialize and show relevant UI.
    """
    # Find current order if exists (most recent)
    order_result = await db.execute(
        select(Order).where(
            and_(
                Order.table_id == ctx.table_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS])
            )
        ).order_by(Order.created_at.desc())
    )
    current_order = order_result.scalars().first()
    
    # Get feature config
    features_config = ctx.tenant.features_config or {}
    self_service_config = features_config.get("self_service", {})
    
    return TableSessionInfo(
        table_id=ctx.table_id,
        table_number=ctx.table_number,
        tenant_name=ctx.tenant.trade_name or ctx.tenant.name,
        tenant_logo=ctx.tenant.logo_url,
        is_occupied=ctx.table.status != TableStatus.FREE,
        current_order_id=current_order.id if current_order else None,
        current_order_total=current_order.total if current_order else 0,
        can_order=self_service_config.get("can_order", True),
        can_call_waiter=self_service_config.get("can_call_waiter", True),
        can_request_bill=self_service_config.get("can_request_bill", True),
        can_view_order_status=self_service_config.get("can_view_status", True)
    )


@router.post("/validate-token", response_model=TableTokenValidation)
async def validate_table_token(
    tenant_id: str,
    table_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a table token without performing any action.
    Useful for the tablet app to verify QR code on scan.
    """
    try:
        ctx = await get_current_table(tenant_id, table_id, token, db)
        
        # Get session info
        session = await get_table_session(ctx, db)
        
        return TableTokenValidation(
            valid=True,
            session=session
        )
    except HTTPException as e:
        return TableTokenValidation(
            valid=False,
            error=e.detail
        )


# ============================================
# AI Upselling Endpoint
# ============================================

@router.post(
    "/{tenant_id}/table/{table_id}/suggest-upsell", 
    response_model=UpsellResponse,
    summary="Get AI upselling suggestions",
    description="AI-powered suggestions require Enterprise plan. Gracefully degrades to random suggestions."
)
async def suggest_upsell(
    request_data: UpsellRequest,
    ctx: TableContext = Depends(get_current_table),
    db: AsyncSession = Depends(get_db)
):
    """
    Get upselling suggestions based on cart contents.
    
    🔒 FEATURE GATING:
    - Enterprise Plan: AI-powered suggestions using Perplexity
    - Other Plans: Random top-rated items (graceful degradation)
    
    Analyzes the current cart and recommends complementary items
    from the menu that would pair well with the customer's order.
    
    Returns 2 suggestions with appetizing reasons in Spanish.
    """
    # Check if tenant has AI upselling feature
    use_ai = has_feature(ctx.tenant, Feature.AI_UPSELLING)
    # Fetch all available menu items for this tenant
    result = await db.execute(
        select(MenuCategory)
        .where(
            and_(
                MenuCategory.tenant_id == ctx.tenant_id,
                MenuCategory.is_active == True
            )
        )
        .options(selectinload(MenuCategory.items))
    )
    categories = result.scalars().all()
    
    # Build list of available menu items
    available_items = []
    cart_item_names = [item.name for item in request_data.cart_items]
    
    for cat in categories:
        for item in cat.items:
            if item.is_available and item.name not in cart_item_names:
                available_items.append({
                    "id": str(item.id),
                    "name": item.name,
                    "description": item.description,
                    "price": item.price,
                    "category": cat.name,
                    "image_url": item.image_url
                })
    
    if not available_items:
        return UpsellResponse(suggestions=[], source="empty_menu")
    
    # Feature-gated AI suggestions
    if use_ai:
        # Enterprise plan: Use AI-powered suggestions
        ai_service = AIService()
        suggestions = await ai_service.suggest_upsell(
            cart_items=cart_item_names,
            available_menu_items=available_items,
            restaurant_type=ctx.tenant.trade_name or ctx.tenant.name,
            max_suggestions=2
        )
        
        return UpsellResponse(
            suggestions=[
                UpsellSuggestion(
                    id=s.get("id"),
                    name=s.get("name"),
                    price=s.get("price", 0),
                    image_url=s.get("image_url"),
                    reason=s.get("reason", "Sugerencia del chef")
                )
                for s in suggestions
            ],
            source="ai"
        )
    else:
        # Non-Enterprise: Random top picks (graceful degradation)
        import random
        random_picks = random.sample(
            available_items, 
            min(2, len(available_items))
        )
        
        default_reasons = [
            "¡Recomendación del chef!",
            "El favorito de nuestros clientes",
            "Complemento perfecto para tu orden",
            "¡No te lo pierdas!"
        ]
        
        return UpsellResponse(
            suggestions=[
                UpsellSuggestion(
                    id=item.get("id"),
                    name=item.get("name"),
                    price=item.get("price", 0),
                    image_url=item.get("image_url"),
                    reason=random.choice(default_reasons)
                )
                for item in random_picks
            ],
            source="random"
        )

