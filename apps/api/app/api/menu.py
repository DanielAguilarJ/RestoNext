from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, MenuItem, Tenant, Ingredient, Recipe
from app.schemas.schemas import MenuItemOptimizationResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/menu", tags=["Menu Management"])

@router.post("/{item_id}/optimize", response_model=MenuItemOptimizationResponse)
async def optimize_dish(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uses AI to generate a neuromarketing description and market price analysis.
    """
    # 1. Fetch Item with Ingredients
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.id == item_id, MenuItem.tenant_id == current_user.tenant_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # 2. Fetch Ingredients for better AI context
    # This assumes a relationship exists or we query via Recipe
    # For now, let's try to get ingredient names
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
