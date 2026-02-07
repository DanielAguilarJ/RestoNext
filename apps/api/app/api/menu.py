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
from app.core.security import get_current_user, require_roles
from app.models.models import User, MenuItem, MenuCategory, Tenant, Ingredient, Recipe, UserRole, RouteDestination, PrinterTarget
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
    prep_time_minutes: int = 15

    class Config:
        from_attributes = True


# ============================================
# Request Schemas (CRUD)
# ============================================

class CategoryCreateRequest(BaseModel):
    """Create category request"""
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    printer_target: Optional[str] = "kitchen"


class CategoryUpdateRequest(BaseModel):
    """Update category request"""
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    printer_target: Optional[str] = None


class ItemCreateRequest(BaseModel):
    """Create menu item request"""
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    route_to: str = "kitchen"
    modifiers_schema: Optional[dict] = None
    tax_config: Optional[dict] = None
    sort_order: int = 0
    prep_time_minutes: int = 15


class ItemUpdateRequest(BaseModel):
    """Update menu item request"""
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    route_to: Optional[str] = None
    modifiers_schema: Optional[dict] = None
    tax_config: Optional[dict] = None
    is_available: Optional[bool] = None
    sort_order: Optional[int] = None
    prep_time_minutes: Optional[int] = None


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


@router.post("/categories", response_model=MenuCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Create a new menu category.
    Requires Admin or Manager role.
    """
    # Map printer_target string to enum
    printer_target_enum = PrinterTarget.KITCHEN
    if request.printer_target:
        try:
            printer_target_enum = PrinterTarget(request.printer_target.lower())
        except ValueError:
            printer_target_enum = PrinterTarget.KITCHEN
    
    category = MenuCategory(
        tenant_id=current_user.tenant_id,
        name=request.name,
        description=request.description,
        sort_order=request.sort_order,
        printer_target=printer_target_enum,
    )
    
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    return MenuCategoryResponse(
        id=str(category.id),
        name=category.name,
        description=category.description,
        sort_order=category.sort_order,
        is_active=category.is_active,
        printer_target=category.printer_target.value if category.printer_target else None,
    )


@router.patch("/categories/{category_id}", response_model=MenuCategoryResponse)
async def update_category(
    category_id: UUID,
    request: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Update a menu category.
    Requires Admin or Manager role.
    """
    result = await db.execute(
        select(MenuCategory).where(
            and_(
                MenuCategory.id == category_id,
                MenuCategory.tenant_id == current_user.tenant_id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update fields if provided
    if request.name is not None:
        category.name = request.name
    if request.description is not None:
        category.description = request.description
    if request.sort_order is not None:
        category.sort_order = request.sort_order
    if request.is_active is not None:
        category.is_active = request.is_active
    if request.printer_target is not None:
        try:
            category.printer_target = PrinterTarget(request.printer_target.lower())
        except ValueError:
            pass
    
    await db.commit()
    await db.refresh(category)
    
    return MenuCategoryResponse(
        id=str(category.id),
        name=category.name,
        description=category.description,
        sort_order=category.sort_order,
        is_active=category.is_active,
        printer_target=category.printer_target.value if category.printer_target else None,
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Soft delete a menu category (sets is_active=False).
    Requires Admin or Manager role.
    """
    result = await db.execute(
        select(MenuCategory).where(
            and_(
                MenuCategory.id == category_id,
                MenuCategory.tenant_id == current_user.tenant_id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Soft delete
    category.is_active = False
    await db.commit()
    
    return None


# ============================================
# Menu Items Endpoints
# ============================================

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
            prep_time_minutes=item.prep_time_minutes,
        )
        for item in items
    ]


@router.post("/items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: ItemCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Create a new menu item.
    Requires Admin or Manager role.
    """
    # Verify category belongs to tenant
    try:
        cat_uuid = UUID(request.category_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category_id format")
    
    cat_result = await db.execute(
        select(MenuCategory).where(
            and_(
                MenuCategory.id == cat_uuid,
                MenuCategory.tenant_id == current_user.tenant_id
            )
        )
    )
    category = cat_result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Map route_to string to enum
    route_to_enum = RouteDestination.KITCHEN
    if request.route_to:
        try:
            route_to_enum = RouteDestination(request.route_to.lower())
        except ValueError:
            route_to_enum = RouteDestination.KITCHEN
    
    item = MenuItem(
        category_id=cat_uuid,
        name=request.name,
        description=request.description,
        price=request.price,
        image_url=request.image_url,
        route_to=route_to_enum,
        modifiers_schema=request.modifiers_schema,
        tax_config=request.tax_config or {"iva": 0.16},
        sort_order=request.sort_order,
        prep_time_minutes=request.prep_time_minutes,
    )
    
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return MenuItemResponse(
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
        prep_time_minutes=item.prep_time_minutes,
    )


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
async def update_item(
    item_id: UUID,
    request: ItemUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Update a menu item.
    Requires Admin or Manager role.
    """
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
    
    # Update fields if provided
    if request.category_id is not None:
        try:
            new_cat_uuid = UUID(request.category_id)
            # Verify new category belongs to tenant
            cat_result = await db.execute(
                select(MenuCategory).where(
                    and_(
                        MenuCategory.id == new_cat_uuid,
                        MenuCategory.tenant_id == current_user.tenant_id
                    )
                )
            )
            if not cat_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Category not found")
            item.category_id = new_cat_uuid
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category_id format")
    
    if request.name is not None:
        item.name = request.name
    if request.description is not None:
        item.description = request.description
    if request.price is not None:
        item.price = request.price
    if request.image_url is not None:
        item.image_url = request.image_url
    if request.route_to is not None:
        try:
            item.route_to = RouteDestination(request.route_to.lower())
        except ValueError:
            pass
    if request.modifiers_schema is not None:
        item.modifiers_schema = request.modifiers_schema
    if request.tax_config is not None:
        item.tax_config = request.tax_config
    if request.is_available is not None:
        item.is_available = request.is_available
    if request.sort_order is not None:
        item.sort_order = request.sort_order
    if request.prep_time_minutes is not None:
        item.prep_time_minutes = request.prep_time_minutes
    
    await db.commit()
    await db.refresh(item)
    
    return MenuItemResponse(
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
        prep_time_minutes=item.prep_time_minutes,
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Soft delete a menu item (sets is_available=False).
    Requires Admin or Manager role.
    """
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
    
    # Soft delete
    item.is_available = False
    await db.commit()
    
    return None


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
