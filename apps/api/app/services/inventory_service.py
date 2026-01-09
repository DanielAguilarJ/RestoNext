"""
RestoNext MX - Inventory Service
Theoretical inventory management with recipe-based deductions (Escandallo)

This service handles:
1. Automatic inventory deduction when orders are delivered/paid
2. Modifier-based ingredient deductions (e.g., "Extra Queso")
3. Stock updates and transaction logging
"""

import logging
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Order, OrderItem, MenuItem, Ingredient, Recipe, 
    InventoryTransaction, TransactionType, OrderStatus
)

logger = logging.getLogger(__name__)


class InventoryError(Exception):
    """Base exception for inventory operations"""
    pass


class InsufficientStockError(InventoryError):
    """Raised when stock is insufficient for deduction"""
    def __init__(self, ingredient_name: str, required: float, available: float):
        self.ingredient_name = ingredient_name
        self.required = required
        self.available = available
        super().__init__(
            f"Insufficient stock for {ingredient_name}: "
            f"requires {required}, available {available}"
        )


async def process_order_inventory(
    db: AsyncSession,
    order_id: UUID,
    user_id: Optional[UUID] = None,
    allow_negative_stock: bool = True
) -> List[InventoryTransaction]:
    """
    Process inventory deductions when an order is delivered or paid.
    
    Flow:
    1. Load order with items
    2. For each item, find its recipe
    3. Calculate deductions (item quantity × recipe quantity)
    4. Check for modifier-linked ingredients
    5. Create InventoryTransaction records
    6. Update ingredient stock_quantity
    
    Args:
        db: AsyncSession for database operations
        order_id: UUID of the order to process
        user_id: Optional UUID of user performing the action
        allow_negative_stock: If False, raises error when stock goes negative
    
    Returns:
        List of created InventoryTransaction records
    
    Raises:
        InventoryError: If order not found
        InsufficientStockError: If allow_negative_stock=False and stock insufficient
    """
    # Load order with items
    order_result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise InventoryError(f"Order {order_id} not found")
    
    # Only process delivered or paid orders
    if order.status not in (OrderStatus.DELIVERED, OrderStatus.PAID):
        logger.warning(
            f"Order {order_id} status is {order.status}, skipping inventory processing"
        )
        return []
    
    transactions: List[InventoryTransaction] = []
    deductions: dict[UUID, float] = {}  # ingredient_id -> total deduction
    
    # Process each order item
    for order_item in order.items:
        # Get menu item with recipes
        menu_item_result = await db.execute(
            select(MenuItem)
            .options(selectinload(MenuItem.recipes).selectinload(Recipe.ingredient))
            .where(MenuItem.id == order_item.menu_item_id)
        )
        menu_item = menu_item_result.scalar_one_or_none()
        
        if not menu_item:
            logger.warning(f"MenuItem {order_item.menu_item_id} not found, skipping")
            continue
        
        if not menu_item.recipes:
            logger.info(
                f"MenuItem '{menu_item.name}' has no recipe defined, skipping inventory"
            )
            continue
        
        # Calculate deductions from recipe
        for recipe in menu_item.recipes:
            deduction_qty = recipe.quantity * order_item.quantity
            ingredient_id = recipe.ingredient_id
            
            if ingredient_id in deductions:
                deductions[ingredient_id] += deduction_qty
            else:
                deductions[ingredient_id] = deduction_qty
        
        # Process modifiers for additional deductions
        await _process_modifier_deductions(
            db, order.tenant_id, order_item, deductions
        )
    
    # Apply deductions and create transactions
    for ingredient_id, total_deduction in deductions.items():
        ingredient_result = await db.execute(
            select(Ingredient).where(Ingredient.id == ingredient_id)
        )
        ingredient = ingredient_result.scalar_one_or_none()
        
        if not ingredient:
            logger.warning(f"Ingredient {ingredient_id} not found, skipping")
            continue
        
        # Check stock availability
        new_stock = ingredient.stock_quantity - total_deduction
        
        if new_stock < 0 and not allow_negative_stock:
            raise InsufficientStockError(
                ingredient.name, total_deduction, ingredient.stock_quantity
            )
        
        # Update stock
        ingredient.stock_quantity = new_stock
        
        # Create transaction record
        transaction = InventoryTransaction(
            tenant_id=order.tenant_id,
            ingredient_id=ingredient_id,
            transaction_type=TransactionType.SALE,
            quantity=-total_deduction,  # Negative for outgoing
            unit=ingredient.unit,
            reference_type="order",
            reference_id=order_id,
            stock_after=new_stock,
            notes=f"Auto-deducted from order {order_id}",
            created_by=user_id
        )
        db.add(transaction)
        transactions.append(transaction)
        
        # Log low stock warning
        if new_stock <= ingredient.min_stock_alert:
            logger.warning(
                f"LOW STOCK ALERT: {ingredient.name} is at {new_stock} {ingredient.unit.value} "
                f"(minimum: {ingredient.min_stock_alert})"
            )
    
    await db.flush()
    return transactions


async def _process_modifier_deductions(
    db: AsyncSession,
    tenant_id: UUID,
    order_item: OrderItem,
    deductions: dict[UUID, float]
) -> None:
    """
    Process modifier-based ingredient deductions.
    
    For example, if "Extra Queso" modifier is selected and there's an
    ingredient with modifier_link matching this modifier, deduct it.
    
    Args:
        db: Database session
        tenant_id: Tenant ID for ingredient lookup
        order_item: Order item with selected_modifiers
        deductions: Dict to accumulate deductions (modified in place)
    """
    if not order_item.selected_modifiers:
        return
    
    for modifier in order_item.selected_modifiers:
        group_name = modifier.get("group_name")
        option_id = modifier.get("option_id")
        
        if not group_name or not option_id:
            continue
        
        # Find ingredients linked to this modifier
        # Using JSONB containment to match modifier_link
        ingredients_result = await db.execute(
            select(Ingredient)
            .where(
                Ingredient.tenant_id == tenant_id,
                Ingredient.is_active == True,
                Ingredient.modifier_link.isnot(None)
            )
        )
        ingredients = ingredients_result.scalars().all()
        
        for ingredient in ingredients:
            link = ingredient.modifier_link
            if (
                link and 
                link.get("group_name") == group_name and 
                link.get("option_id") == option_id
            ):
                # Found a linked ingredient, add deduction
                modifier_qty = link.get("quantity", 1.0) * order_item.quantity
                
                if ingredient.id in deductions:
                    deductions[ingredient.id] += modifier_qty
                else:
                    deductions[ingredient.id] = modifier_qty
                
                logger.debug(
                    f"Modifier '{option_id}' adding {modifier_qty} "
                    f"{ingredient.unit.value} of {ingredient.name}"
                )


async def update_stock(
    db: AsyncSession,
    tenant_id: UUID,
    ingredient_id: UUID,
    quantity: float,
    transaction_type: TransactionType,
    user_id: Optional[UUID] = None,
    notes: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[UUID] = None
) -> InventoryTransaction:
    """
    Update ingredient stock and create transaction record.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        ingredient_id: Ingredient to update
        quantity: Amount to add (positive) or remove (negative)
        transaction_type: Type of transaction
        user_id: User performing the action
        notes: Optional transaction notes
        reference_type: Optional reference type (e.g., "purchase_order")
        reference_id: Optional reference document ID
    
    Returns:
        Created InventoryTransaction
    
    Raises:
        InventoryError: If ingredient not found
    """
    ingredient_result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.tenant_id == tenant_id
        )
    )
    ingredient = ingredient_result.scalar_one_or_none()
    
    if not ingredient:
        raise InventoryError(f"Ingredient {ingredient_id} not found for tenant")
    
    # Update stock
    ingredient.stock_quantity += quantity
    
    # Create transaction
    transaction = InventoryTransaction(
        tenant_id=tenant_id,
        ingredient_id=ingredient_id,
        transaction_type=transaction_type,
        quantity=quantity,
        unit=ingredient.unit,
        reference_type=reference_type,
        reference_id=reference_id,
        stock_after=ingredient.stock_quantity,
        notes=notes,
        created_by=user_id
    )
    db.add(transaction)
    await db.flush()
    
    return transaction


async def get_low_stock_ingredients(
    db: AsyncSession,
    tenant_id: UUID
) -> List[Ingredient]:
    """
    Get all ingredients with stock below their minimum alert level.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
    
    Returns:
        List of ingredients with low stock
    """
    result = await db.execute(
        select(Ingredient)
        .where(
            Ingredient.tenant_id == tenant_id,
            Ingredient.is_active == True,
            Ingredient.stock_quantity <= Ingredient.min_stock_alert
        )
        .order_by(Ingredient.name)
    )
    return list(result.scalars().all())


async def get_ingredient_transactions(
    db: AsyncSession,
    tenant_id: UUID,
    ingredient_id: UUID,
    limit: int = 50
) -> List[InventoryTransaction]:
    """
    Get recent transactions for an ingredient.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        ingredient_id: Ingredient ID
        limit: Maximum transactions to return
    
    Returns:
        List of transactions, most recent first
    """
    result = await db.execute(
        select(InventoryTransaction)
        .where(
            InventoryTransaction.tenant_id == tenant_id,
            InventoryTransaction.ingredient_id == ingredient_id
        )
        .order_by(InventoryTransaction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
