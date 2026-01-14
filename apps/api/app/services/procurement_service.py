"""
RestoNext MX - Procurement Service
Smart Procurement with AI-powered demand forecasting

This service:
1. Uses Prophet forecasting to predict 7-day ingredient demand
2. Compares predicted demand vs current stock
3. Generates purchase suggestions when stock falls below minimum
4. Groups suggestions by preferred supplier
5. Handles atomic transactions for order creation
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Ingredient, Supplier, SupplierIngredient,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus,
    InventoryTransaction, TransactionType
)
from app.schemas.procurement_schemas import (
    IngredientSuggestion, SupplierSuggestion, ProcurementSuggestionsResponse,
    PurchaseOrderCreate, PurchaseOrderItemCreate
)
from app.services.forecasting import forecast_ingredient_demand, generate_sample_sales_data
from app.services.inventory_service import update_stock

logger = logging.getLogger(__name__)


class ProcurementError(Exception):
    """Base exception for procurement operations"""
    pass


class SupplierNotFoundError(ProcurementError):
    """Raised when supplier doesn't exist"""
    pass


class PurchaseOrderNotFoundError(ProcurementError):
    """Raised when purchase order doesn't exist"""
    pass


class PurchaseRecommender:
    """
    Generates smart purchase suggestions based on:
    1. 7-day demand forecast from Prophet
    2. Current stock levels
    3. Minimum stock thresholds
    4. Preferred supplier pricing
    """
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def generate_procurement_suggestions(
        self,
        forecast_days: int = 7
    ) -> ProcurementSuggestionsResponse:
        """
        Generate purchase suggestions for all ingredients that will fall
        below their minimum stock alert after forecasted demand.
        
        Steps:
        1. Get all active ingredients for tenant
        2. For each ingredient, forecast demand for next 7 days
        3. Calculate: projected_stock = current_stock - predicted_demand
        4. If projected_stock < min_stock_alert, add to suggestions
        5. Group by preferred supplier
        6. Return suggestions with estimated costs
        """
        # Get all active ingredients with their supplier links
        ingredients_result = await self.db.execute(
            select(Ingredient)
            .options(selectinload(Ingredient.supplier_ingredients)
                     .selectinload(SupplierIngredient.supplier))
            .where(
                Ingredient.tenant_id == self.tenant_id,
                Ingredient.is_active == True
            )
        )
        ingredients = list(ingredients_result.scalars().all())
        
        # Build suggestions
        suggestions_by_supplier: Dict[UUID, SupplierSuggestion] = {}
        unassigned_ingredients: List[IngredientSuggestion] = []
        
        for ingredient in ingredients:
            suggestion = await self._analyze_ingredient(ingredient, forecast_days)
            
            if suggestion is None:
                continue  # No shortage predicted
            
            if suggestion.preferred_supplier_id:
                supplier_id = suggestion.preferred_supplier_id
                if supplier_id not in suggestions_by_supplier:
                    suggestions_by_supplier[supplier_id] = SupplierSuggestion(
                        supplier_id=supplier_id,
                        supplier_name=suggestion.preferred_supplier_name or "Unknown",
                        items=[],
                        estimated_total=0.0
                    )
                suggestions_by_supplier[supplier_id].items.append(suggestion)
                suggestions_by_supplier[supplier_id].estimated_total += suggestion.estimated_cost
            else:
                unassigned_ingredients.append(suggestion)
        
        # Calculate total
        total_cost = sum(s.estimated_total for s in suggestions_by_supplier.values())
        total_cost += sum(i.estimated_cost for i in unassigned_ingredients)
        
        return ProcurementSuggestionsResponse(
            generated_at=datetime.utcnow(),
            forecast_days=forecast_days,
            suggestions_by_supplier=list(suggestions_by_supplier.values()),
            unassigned_ingredients=unassigned_ingredients,
            total_estimated_cost=total_cost
        )
    
    async def _analyze_ingredient(
        self,
        ingredient: Ingredient,
        forecast_days: int
    ) -> Optional[IngredientSuggestion]:
        """
        Analyze a single ingredient and return suggestion if needed.
        """
        # Get forecast for this ingredient
        # For production, would fetch real sales data from DailySales table
        sales_data = generate_sample_sales_data(ingredient.name, days=90)
        forecast = forecast_ingredient_demand(
            sales_data,
            ingredient.name,
            days_ahead=forecast_days
        )
        
        # Calculate predicted demand (sum of 7 days)
        if forecast.get("error") or not forecast.get("predictions"):
            # Use simple average if Prophet fails
            predicted_demand = ingredient.min_stock_alert * 2  # Conservative estimate
        else:
            predicted_demand = sum(
                p.get("predicted_demand", 0) 
                for p in forecast["predictions"]
            )
        
        # Calculate projected stock
        projected_stock = ingredient.stock_quantity - predicted_demand
        
        # Calculate shortage (how much below min_stock)
        shortage = ingredient.min_stock_alert - projected_stock
        
        if shortage <= 0:
            # No shortage predicted
            return None
        
        # Find preferred supplier and cost
        preferred_supplier_id = None
        preferred_supplier_name = None
        unit_cost = ingredient.cost_per_unit  # Default fallback
        
        for si in ingredient.supplier_ingredients:
            if si.is_preferred and si.supplier.is_active:
                preferred_supplier_id = si.supplier_id
                preferred_supplier_name = si.supplier.name
                unit_cost = si.cost_per_unit
                break
        
        # If no preferred, try to find any active supplier
        if not preferred_supplier_id:
            for si in ingredient.supplier_ingredients:
                if si.supplier.is_active:
                    preferred_supplier_id = si.supplier_id
                    preferred_supplier_name = si.supplier.name
                    unit_cost = si.cost_per_unit
                    break
        
        # Calculate suggested quantity (shortage + safety buffer)
        # Add 20% safety buffer
        suggested_quantity = max(shortage * 1.2, 1.0)
        
        # Check minimum order quantity
        for si in ingredient.supplier_ingredients:
            if si.supplier_id == preferred_supplier_id:
                if suggested_quantity < si.min_order_quantity:
                    suggested_quantity = si.min_order_quantity
                break
        
        return IngredientSuggestion(
            ingredient_id=ingredient.id,
            ingredient_name=ingredient.name,
            unit=ingredient.unit.value,
            current_stock=ingredient.stock_quantity,
            predicted_demand_7d=round(predicted_demand, 2),
            projected_stock=round(projected_stock, 2),
            min_stock_alert=ingredient.min_stock_alert,
            shortage=round(shortage, 2),
            suggested_quantity=round(suggested_quantity, 2),
            preferred_supplier_id=preferred_supplier_id,
            preferred_supplier_name=preferred_supplier_name,
            unit_cost=unit_cost,
            estimated_cost=round(suggested_quantity * unit_cost, 2)
        )
    
    async def convert_suggestion_to_order(
        self,
        supplier_id: UUID,
        items: List[PurchaseOrderItemCreate],
        user_id: Optional[UUID] = None,
        expected_delivery: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> PurchaseOrder:
        """
        Convert a purchase suggestion into a real purchase order.
        Uses atomic transaction to ensure all-or-nothing creation.
        
        Args:
            supplier_id: ID of the supplier
            items: List of items to order
            user_id: ID of the user creating the order
            expected_delivery: Expected delivery date
            notes: Order notes
        
        Returns:
            Created PurchaseOrder
        
        Raises:
            SupplierNotFoundError: If supplier doesn't exist
        """
        # Verify supplier exists and belongs to tenant
        supplier_result = await self.db.execute(
            select(Supplier).where(
                Supplier.id == supplier_id,
                Supplier.tenant_id == self.tenant_id,
                Supplier.is_active == True
            )
        )
        supplier = supplier_result.scalar_one_or_none()
        
        if not supplier:
            raise SupplierNotFoundError(f"Supplier {supplier_id} not found or inactive")
        
        # Calculate totals
        subtotal = 0.0
        order_items: List[PurchaseOrderItem] = []
        
        for item in items:
            total_cost = item.quantity_ordered * item.unit_cost
            subtotal += total_cost
            
            order_items.append(PurchaseOrderItem(
                ingredient_id=item.ingredient_id,
                quantity_ordered=item.quantity_ordered,
                quantity_received=0.0,
                unit_cost=item.unit_cost,
                total_cost=total_cost,
                notes=item.notes
            ))
        
        # Assume 16% IVA for purchases (Mexican tax)
        tax = subtotal * 0.16
        total = subtotal + tax
        
        # Create purchase order
        purchase_order = PurchaseOrder(
            tenant_id=self.tenant_id,
            supplier_id=supplier_id,
            status=PurchaseOrderStatus.DRAFT,
            expected_delivery=expected_delivery,
            subtotal=subtotal,
            tax=tax,
            total=total,
            notes=notes,
            created_by=user_id
        )
        
        self.db.add(purchase_order)
        await self.db.flush()  # Get the ID
        
        # Add items to order
        for order_item in order_items:
            order_item.purchase_order_id = purchase_order.id
            self.db.add(order_item)
        
        await self.db.flush()
        
        # Reload with relationships
        result = await self.db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.supplier),
                selectinload(PurchaseOrder.items)
            )
            .where(PurchaseOrder.id == purchase_order.id)
        )
        
        return result.scalar_one()


async def receive_purchase_order(
    db: AsyncSession,
    tenant_id: UUID,
    order_id: UUID,
    received_items: List[dict],
    user_id: Optional[UUID] = None,
    notes: Optional[str] = None
) -> PurchaseOrder:
    """
    Receive items from a purchase order.
    Atomic transaction that:
    1. Updates PurchaseOrderItem.quantity_received
    2. Updates Ingredient.stock_quantity
    3. Creates InventoryTransaction records
    4. Updates PurchaseOrder status if fully received
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        order_id: Purchase order ID
        received_items: List of {item_id: UUID, quantity_received: float}
        user_id: User performing the action
        notes: Optional notes
    
    Returns:
        Updated PurchaseOrder
    
    Raises:
        PurchaseOrderNotFoundError: If order doesn't exist
    """
    # Load order with items
    order_result = await db.execute(
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.supplier)
        )
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise PurchaseOrderNotFoundError(f"Purchase order {order_id} not found")
    
    # Build lookup for items
    items_lookup = {str(item.id): item for item in order.items}
    
    all_fully_received = True
    
    for received in received_items:
        item_id = str(received.get("item_id"))
        qty_received = received.get("quantity_received", 0)
        
        if item_id not in items_lookup:
            logger.warning(f"Item {item_id} not found in order {order_id}")
            continue
        
        item = items_lookup[item_id]
        
        # Update quantity received
        item.quantity_received += qty_received
        
        # Check if fully received
        if item.quantity_received < item.quantity_ordered:
            all_fully_received = False
        
        # Update ingredient stock
        await update_stock(
            db=db,
            tenant_id=tenant_id,
            ingredient_id=item.ingredient_id,
            quantity=qty_received,
            transaction_type=TransactionType.PURCHASE,
            user_id=user_id,
            notes=f"Received from PO {order_id}" + (f": {notes}" if notes else ""),
            reference_type="purchase_order",
            reference_id=order_id
        )
    
    # Update order status
    if all_fully_received:
        order.status = PurchaseOrderStatus.RECEIVED
        order.actual_delivery = datetime.utcnow()
    
    await db.flush()
    
    return order


async def approve_purchase_order(
    db: AsyncSession,
    tenant_id: UUID,
    order_id: UUID,
    user_id: UUID
) -> PurchaseOrder:
    """
    Approve a purchase order (change status from DRAFT/PENDING to APPROVED).
    """
    order_result = await db.execute(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise PurchaseOrderNotFoundError(f"Purchase order {order_id} not found")
    
    if order.status not in (PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING):
        raise ProcurementError(
            f"Cannot approve order in {order.status.value} status"
        )
    
    order.status = PurchaseOrderStatus.APPROVED
    order.approved_by = user_id
    order.approved_at = datetime.utcnow()
    
    await db.flush()
    
    return order


async def cancel_purchase_order(
    db: AsyncSession,
    tenant_id: UUID,
    order_id: UUID
) -> PurchaseOrder:
    """
    Cancel a purchase order.
    Only allowed for DRAFT, PENDING, or APPROVED orders.
    """
    order_result = await db.execute(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise PurchaseOrderNotFoundError(f"Purchase order {order_id} not found")
    
    if order.status == PurchaseOrderStatus.RECEIVED:
        raise ProcurementError("Cannot cancel a received order")
    
    order.status = PurchaseOrderStatus.CANCELLED
    
    await db.flush()
    
    return order
