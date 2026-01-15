
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_manager_or_admin
from app.models.models import User, Ingredient, TransactionType, UnitOfMeasure
from app.schemas.inventory_schemas import (
    IngredientCreate, IngredientUpdate, IngredientResponse,
    StockUpdate, InventoryTransactionResponse
)
from app.services.inventory_service import (
    update_stock, get_ingredient_transactions, InventoryError
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get(
    "",
    response_model=List[IngredientResponse],
    summary="List all ingredients/supplies"
)
async def list_ingredients(
    low_stock: bool = False,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List inventory ingredients.
    
    Filters:
    - low_stock: if true, returns only ingredients where stock <= min_stock
    - active_only: if true, returns only active ingredients
    """
    query = (
        select(Ingredient)
        .options(selectinload(Ingredient.recipes))  # Load relationships
        .where(Ingredient.tenant_id == current_user.tenant_id)
    )
    
    if active_only:
        query = query.where(Ingredient.is_active == True)
        
    if low_stock:
        query = query.where(Ingredient.stock_quantity <= Ingredient.min_stock_alert)
        
    query = query.order_by(Ingredient.name)
    
    result = await db.execute(query)
    ingredients = result.scalars().all()

    # Determine usage count without separate queries
    response = []
    for ing in ingredients:
        # Assuming recipes relationship is populated
        resp = IngredientResponse.model_validate(ing)
        resp.usage_count = len(ing.recipes) if ing.recipes else 0
        response.append(resp)

    return response

@router.post(
    "",
    response_model=IngredientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new ingredient"
)
async def create_ingredient(
    ingredient_data: IngredientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    # Check if name exists
    existing = await db.execute(
        select(Ingredient).where(
            Ingredient.tenant_id == current_user.tenant_id,
            Ingredient.name == ingredient_data.name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ingredient with this name already exists"
        )
    
    try:
        # Validate unit enum
        unit_enum = UnitOfMeasure(ingredient_data.unit)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid unit. Valid values: {[e.value for e in UnitOfMeasure]}"
        )

    ingredient = Ingredient(
        tenant_id=current_user.tenant_id,
        name=ingredient_data.name,
        sku=ingredient_data.sku,
        unit=unit_enum,
        min_stock_alert=ingredient_data.min_stock_alert,
        cost_per_unit=ingredient_data.cost_per_unit,
        modifier_link=ingredient_data.modifier_link,
        stock_quantity=0.0 # Start with 0, must use adjustment to add stock
    )
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient

@router.get(
    "/{ingredient_id}",
    response_model=IngredientResponse,
    summary="Get ingredient details"
)
async def get_ingredient(
    ingredient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.tenant_id == current_user.tenant_id
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient

@router.patch(
    "/{ingredient_id}",
    response_model=IngredientResponse,
    summary="Update ingredient"
)
async def update_ingredient(
    ingredient_id: UUID,
    data: IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    result = await db.execute(
        select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.tenant_id == current_user.tenant_id
        )
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
        
    update_dict = data.model_dump(exclude_unset=True)
    if "unit" in update_dict:
        try:
            update_dict["unit"] = UnitOfMeasure(update_dict["unit"])
        except ValueError:
             raise HTTPException(status_code=400, detail="Invalid unit")
             
    for key, value in update_dict.items():
        setattr(ingredient, key, value)
        
    await db.commit()
    await db.refresh(ingredient)
    return ingredient

@router.post(
    "/{ingredient_id}/adjust",
    response_model=InventoryTransactionResponse,
    summary="Adjust stock level"
)
async def adjust_stock(
    ingredient_id: UUID,
    adjustment: StockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    try:
        tx_type = TransactionType(adjustment.transaction_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    try:
        transaction = await update_stock(
            db=db,
            tenant_id=current_user.tenant_id,
            ingredient_id=ingredient_id,
            quantity=adjustment.quantity,
            transaction_type=tx_type,
            user_id=current_user.id,
            notes=adjustment.notes,
            reference_type=adjustment.reference_type,
            reference_id=adjustment.reference_id
        )
        await db.commit()
        return transaction
    except InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/{ingredient_id}/transactions",
    response_model=List[InventoryTransactionResponse],
    summary="Get stock history"
)
async def list_transactions(
    ingredient_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership
    result = await db.execute(
         select(Ingredient).where(
            Ingredient.id == ingredient_id,
            Ingredient.tenant_id == current_user.tenant_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ingredient not found")
        
    return await get_ingredient_transactions(
        db, current_user.tenant_id, ingredient_id, limit
    )
