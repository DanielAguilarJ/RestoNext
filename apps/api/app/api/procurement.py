"""
RestoNext MX - Procurement API Routes
Smart procurement with AI-powered demand forecasting
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_manager_or_admin
from app.models.models import (
    User, Supplier, SupplierIngredient, PurchaseOrder, 
    PurchaseOrderStatus, Ingredient
)
from app.schemas.procurement_schemas import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    SupplierIngredientCreate, SupplierIngredientUpdate, SupplierIngredientResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderItemResponse,
    PurchaseOrderReceive,
    ProcurementSuggestionsResponse
)
from app.services.procurement_service import (
    PurchaseRecommender, 
    receive_purchase_order, 
    approve_purchase_order,
    cancel_purchase_order,
    ProcurementError,
    SupplierNotFoundError,
    PurchaseOrderNotFoundError
)

router = APIRouter(prefix="/procurement", tags=["Procurement"])


# ============================================
# Procurement Suggestions
# ============================================

@router.post(
    "/generate-suggestions",
    response_model=ProcurementSuggestionsResponse,
    summary="Generate AI-powered purchase suggestions"
)
async def generate_suggestions(
    forecast_days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Generate smart procurement suggestions based on:
    - 7-day AI demand forecast (Prophet)
    - Current stock levels
    - Minimum stock thresholds
    - Preferred supplier pricing
    
    Returns suggestions grouped by supplier with estimated costs.
    """
    recommender = PurchaseRecommender(db, current_user.tenant_id)
    return await recommender.generate_procurement_suggestions(forecast_days)


@router.post(
    "/generate-proposal",
    response_model=List[PurchaseOrderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate and CREATE draft Purchase Orders using AI"
)
async def generate_proposal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Orchestrate the full AI procurement flow:
    1. Forecast demand
    2. Create draft Purchase Orders automatically
    3. Return created orders
    """
    recommender = PurchaseRecommender(db, current_user.tenant_id)
    created_orders = await recommender.generate_ai_purchase_proposal(user_id=current_user.id)
    
    # Reload to ensure relationships (like supplier) are loaded for response
    # (The convert_suggestion_to_order method typically reloads, but let's be safe if we need to conform to _build_order_response)
    
    return [_build_order_response(o) for o in created_orders]


# ============================================
# Purchase Orders
# ============================================

@router.post(
    "/orders",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create purchase order from suggestion"
)
async def create_purchase_order(
    order_data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Convert a purchase suggestion into a real purchase order.
    Order is created with DRAFT status.
    """
    try:
        recommender = PurchaseRecommender(db, current_user.tenant_id)
        order = await recommender.convert_suggestion_to_order(
            supplier_id=order_data.supplier_id,
            items=order_data.items,
            user_id=current_user.id,
            expected_delivery=order_data.expected_delivery,
            notes=order_data.notes
        )
        await db.commit()
        
        return _build_order_response(order)
        
    except SupplierNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProcurementError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/orders",
    response_model=List[PurchaseOrderResponse],
    summary="List purchase orders"
)
async def list_purchase_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    supplier_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    List all purchase orders for the tenant.
    Optionally filter by status or supplier.
    """
    query = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items)
        )
        .where(PurchaseOrder.tenant_id == current_user.tenant_id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    
    if status_filter:
        try:
            status_enum = PurchaseOrderStatus(status_filter)
            query = query.where(PurchaseOrder.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    if supplier_id:
        query = query.where(PurchaseOrder.supplier_id == supplier_id)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return [_build_order_response(o) for o in orders]


@router.get(
    "/orders/{order_id}",
    response_model=PurchaseOrderResponse,
    summary="Get purchase order by ID"
)
async def get_purchase_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """Get a specific purchase order with all items."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items)
        )
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.tenant_id == current_user.tenant_id
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    return _build_order_response(order)


@router.post(
    "/orders/{order_id}/approve",
    response_model=PurchaseOrderResponse,
    summary="Approve a purchase order"
)
async def approve_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """Approve a draft or pending purchase order."""
    try:
        order = await approve_purchase_order(
            db, current_user.tenant_id, order_id, current_user.id
        )
        await db.commit()
        
        # Reload with relationships
        result = await db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.supplier),
                selectinload(PurchaseOrder.items)
            )
            .where(PurchaseOrder.id == order_id)
        )
        order = result.scalar_one()
        
        return _build_order_response(order)
        
    except PurchaseOrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProcurementError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/orders/{order_id}/receive",
    response_model=PurchaseOrderResponse,
    summary="Receive items from purchase order"
)
async def receive_order(
    order_id: UUID,
    receive_data: PurchaseOrderReceive,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Receive items from a purchase order.
    Updates inventory and creates transaction records.
    """
    try:
        items = [
            {"item_id": item.item_id, "quantity_received": item.quantity_received}
            for item in receive_data.items
        ]
        
        order = await receive_purchase_order(
            db=db,
            tenant_id=current_user.tenant_id,
            order_id=order_id,
            received_items=items,
            user_id=current_user.id,
            notes=receive_data.notes
        )
        await db.commit()
        
        # Reload with relationships
        result = await db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.supplier),
                selectinload(PurchaseOrder.items)
            )
            .where(PurchaseOrder.id == order_id)
        )
        order = result.scalar_one()
        
        return _build_order_response(order)
        
    except PurchaseOrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProcurementError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/orders/{order_id}/cancel",
    response_model=PurchaseOrderResponse,
    summary="Cancel a purchase order"
)
async def cancel_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """Cancel a purchase order (not allowed for received orders)."""
    try:
        order = await cancel_purchase_order(
            db, current_user.tenant_id, order_id
        )
        await db.commit()
        
        # Reload with relationships
        result = await db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.supplier),
                selectinload(PurchaseOrder.items)
            )
            .where(PurchaseOrder.id == order_id)
        )
        order = result.scalar_one()
        
        return _build_order_response(order)
        
    except PurchaseOrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ProcurementError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================
# Suppliers CRUD
# ============================================

@router.post(
    "/suppliers",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new supplier"
)
async def create_supplier(
    supplier_data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """Create a new supplier for the tenant."""
    supplier = Supplier(
        tenant_id=current_user.tenant_id,
        name=supplier_data.name,
        contact_name=supplier_data.contact_name,
        email=supplier_data.email,
        phone=supplier_data.phone,
        address=supplier_data.address,
        notes=supplier_data.notes
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    
    return supplier


@router.get(
    "/suppliers",
    response_model=List[SupplierResponse],
    summary="List all suppliers"
)
async def list_suppliers(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all suppliers for the tenant."""
    query = select(Supplier).where(
        Supplier.tenant_id == current_user.tenant_id
    ).order_by(Supplier.name)
    
    if active_only:
        query = query.where(Supplier.is_active == True)
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get(
    "/suppliers/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get supplier by ID"
)
async def get_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific supplier."""
    result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    )
    supplier = result.scalar_one_or_none()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return supplier


@router.patch(
    "/suppliers/{supplier_id}",
    response_model=SupplierResponse,
    summary="Update supplier"
)
async def update_supplier(
    supplier_id: UUID,
    update_data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """Update a supplier's information."""
    result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    )
    supplier = result.scalar_one_or_none()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(supplier, field, value)
    
    await db.commit()
    await db.refresh(supplier)
    
    return supplier


# ============================================
# Supplier-Ingredient Links
# ============================================

@router.post(
    "/supplier-ingredients",
    response_model=SupplierIngredientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link ingredient to supplier with pricing"
)
async def create_supplier_ingredient(
    link_data: SupplierIngredientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    """
    Link an ingredient to a supplier with pricing information.
    Use is_preferred=true to set as the preferred supplier.
    """
    # Verify supplier belongs to tenant
    supplier_result = await db.execute(
        select(Supplier).where(
            Supplier.id == link_data.supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    )
    if not supplier_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Verify ingredient belongs to tenant
    ingredient_result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == link_data.ingredient_id,
            Ingredient.tenant_id == current_user.tenant_id
        )
    )
    if not ingredient_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )
    
    # If setting as preferred, unset other preferred suppliers for this ingredient
    if link_data.is_preferred:
        await db.execute(
            select(SupplierIngredient)
            .where(SupplierIngredient.ingredient_id == link_data.ingredient_id)
        )
        existing_links = await db.execute(
            select(SupplierIngredient).where(
                SupplierIngredient.ingredient_id == link_data.ingredient_id
            )
        )
        for link in existing_links.scalars().all():
            link.is_preferred = False
    
    supplier_ingredient = SupplierIngredient(
        supplier_id=link_data.supplier_id,
        ingredient_id=link_data.ingredient_id,
        cost_per_unit=link_data.cost_per_unit,
        lead_days=link_data.lead_days,
        min_order_quantity=link_data.min_order_quantity,
        notes=link_data.notes,
        is_preferred=link_data.is_preferred
    )
    db.add(supplier_ingredient)
    await db.commit()
    await db.refresh(supplier_ingredient)
    
    return supplier_ingredient


@router.get(
    "/suppliers/{supplier_id}/ingredients",
    response_model=List[SupplierIngredientResponse],
    summary="List ingredients for a supplier"
)
async def list_supplier_ingredients(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all ingredients linked to a supplier with pricing."""
    # Verify supplier belongs to tenant
    supplier_result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.tenant_id == current_user.tenant_id
        )
    )
    if not supplier_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    result = await db.execute(
        select(SupplierIngredient).where(
            SupplierIngredient.supplier_id == supplier_id
        )
    )
    
    return list(result.scalars().all())


# ============================================
# Helper Functions
# ============================================

def _build_order_response(order: PurchaseOrder) -> PurchaseOrderResponse:
    """Build response model from ORM model."""
    items = [
        PurchaseOrderItemResponse(
            id=item.id,
            purchase_order_id=item.purchase_order_id,
            ingredient_id=item.ingredient_id,
            ingredient_name=None,  # Would need to join
            quantity_ordered=item.quantity_ordered,
            quantity_received=item.quantity_received,
            unit_cost=item.unit_cost,
            total_cost=item.total_cost,
            notes=item.notes,
            created_at=item.created_at
        )
        for item in order.items
    ]
    
    return PurchaseOrderResponse(
        id=order.id,
        tenant_id=order.tenant_id,
        supplier_id=order.supplier_id,
        supplier_name=order.supplier.name if order.supplier else None,
        status=order.status.value,
        expected_delivery=order.expected_delivery,
        actual_delivery=order.actual_delivery,
        subtotal=order.subtotal,
        tax=order.tax,
        total=order.total,
        notes=order.notes,
        items=items,
        created_at=order.created_at,
        created_by=order.created_by,
        approved_by=order.approved_by,
        approved_at=order.approved_at
    )
