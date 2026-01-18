"""
RestoNext MX - Menu API Routes
Menu categories and items listing for POS and dashboard
"""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, MenuItem, MenuCategory, Tenant, Ingredient, Recipe
from app.schemas.schemas import MenuItemOptimizationResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/menu", tags=["Menu Management"])


# ============================================
# Response Schemas
# ============================================

class MenuCategoryResponse(BaseModel):
    """Menu category response model"""
    id: str
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    printer_target: Optional[str] = None

    class Config:
        from_attributes = True


class MenuItemResponse(BaseModel):
    """Menu item response model"""
    id: str
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    route_to: str = "kitchen"
    modifiers_schema: Optional[dict] = None
    tax_config: dict = {"iva": 0.16}
    is_available: bool = True
    sort_order: int = 0

    class Config:
        from_attributes = True


# ============================================
# Menu Categories Endpoints
# ============================================

@router.get("/categories", response_model=List[MenuCategoryResponse])
async def list_categories(
    restaurant_id: Optional[str] = Query(None, description="Filter by restaurant/tenant ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all menu categories for the current tenant.
    Used by the POS to display category tabs.
    """
    # Use the user's tenant_id (ignoring restaurant_id parameter for multi-tenant safety)
    tenant_id = current_user.tenant_id
    
    result = await db.execute(
        select(MenuCategory)
        .where(
            and_(
                MenuCategory.tenant_id == tenant_id,
                MenuCategory.is_active == True
            )
        )
        .order_by(MenuCategory.sort_order)
    )
    categories = result.scalars().all()
    
    return [
        MenuCategoryResponse(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            sort_order=cat.sort_order,
            is_active=cat.is_active,
            printer_target=cat.printer_target.value if cat.printer_target else None,
        )
        for cat in categories
    ]


@router.get("/items", response_model=List[MenuItemResponse])
async def list_items(
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all menu items, optionally filtered by category.
    Used by the POS to display items in the menu grid.
    """
    # Build query
    query = (
        select(MenuItem)
        .join(MenuCategory)
        .where(MenuCategory.tenant_id == current_user.tenant_id)
    )
    
    if category_id:
        try:
            cat_uuid = UUID(category_id)
            query = query.where(MenuItem.category_id == cat_uuid)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category_id format"
            )
    
    query = query.where(MenuItem.is_available == True).order_by(MenuItem.sort_order)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        MenuItemResponse(
            id=str(item.id),
            category_id=str(item.category_id),
            name=item.name,
            description=item.description,
            price=item.price,
            image_url=item.image_url,
            route_to=item.route_to.value if item.route_to else "kitchen",
            modifiers_schema=item.modifiers_schema,
            tax_config=item.tax_config or {"iva": 0.16},
            is_available=item.is_available,
            sort_order=item.sort_order,
        )
        for item in items
    ]


# ============================================
# AI Optimization Endpoint
# ============================================

@router.post("/{item_id}/optimize", response_model=MenuItemOptimizationResponse)
async def optimize_dish(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uses AI to generate a neuromarketing description and market price analysis.
    """
    # 1. Fetch Item - need to join with category to verify tenant
    result = await db.execute(
        select(MenuItem)
        .join(MenuCategory)
        .where(
            and_(
                MenuItem.id == item_id,
                MenuCategory.tenant_id == current_user.tenant_id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # 2. Fetch Ingredients for better AI context
    ing_result = await db.execute(
        select(Ingredient.name)
        .join(Recipe)
        .where(Recipe.menu_item_id == item_id)
    )
    ingredients = [r[0] for r in ing_result.all()]
    if not ingredients:
        ingredients = ["Standard secret blend"]

    # 3. Get Tenant Location
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    location = "Mexico, CDMX"
    if tenant and tenant.fiscal_address and isinstance(tenant.fiscal_address, dict):
        location = f"{tenant.fiscal_address.get('city', '')}, {tenant.fiscal_address.get('state', '')}"

    # 4. Call AI
    ai_service = AIService()
    optimization = await ai_service.optimize_menu_item(
        item_name=item.name,
        ingredients=ingredients,
        current_price=item.price,
        location=location
    )
    
    return optimization
