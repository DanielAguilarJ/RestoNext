
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

class IngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    sku: Optional[str] = Field(None, max_length=64)
    unit: str # enum: kg, g, lt, ml, pza, porcion
    min_stock_alert: float = Field(default=0.0, ge=0)
    cost_per_unit: float = Field(default=0.0, ge=0)
    modifier_link: Optional[dict] = None

class IngredientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    sku: Optional[str] = Field(None, max_length=64)
    unit: Optional[str] = None
    min_stock_alert: Optional[float] = Field(None, ge=0)
    cost_per_unit: Optional[float] = Field(None, ge=0)
    modifier_link: Optional[dict] = None
    is_active: Optional[bool] = None

class IngredientResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    sku: Optional[str]
    unit: str
    stock_quantity: float
    min_stock_alert: float
    cost_per_unit: float
    modifier_link: Optional[dict]
    is_active: bool
    usage_count: Optional[int] = 0 # How many dishes use this
    created_at: datetime
    
    class Config:
        from_attributes = True

class StockUpdate(BaseModel):
    quantity: float
    transaction_type: str # purchase, sale, adjustment, waste
    notes: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None

class InventoryTransactionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    ingredient_id: UUID
    transaction_type: str
    quantity: float
    unit: str
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    stock_after: float
    notes: Optional[str]
    created_at: datetime
    created_by: Optional[UUID]

    class Config:
        from_attributes = True


# ============================================
# Linked Products (Menu ↔ Inventory)
# ============================================

class LinkedProductItem(BaseModel):
    id: str
    name: str
    category_name: Optional[str] = None
    recipe_quantity: float
    recipe_unit: str

class LinkedProductsResponse(BaseModel):
    ingredient_id: str
    ingredient_name: str
    linked_products: List[LinkedProductItem]
    total_products: int
