"""
RestoNext MX - Procurement Schemas
Request/Response validation models for Smart Procurement module
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================
# Supplier Schemas
# ============================================

class SupplierCreate(BaseModel):
    """Create a new supplier"""
    name: str = Field(..., min_length=1, max_length=128)
    contact_name: Optional[str] = Field(None, max_length=128)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[dict] = None
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    """Update supplier fields"""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    contact_name: Optional[str] = Field(None, max_length=128)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[dict] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(BaseModel):
    """Supplier response model"""
    id: UUID
    tenant_id: UUID
    name: str
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[dict]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Supplier Ingredient Schemas
# ============================================

class SupplierIngredientCreate(BaseModel):
    """Link an ingredient to a supplier with pricing"""
    supplier_id: UUID
    ingredient_id: UUID
    cost_per_unit: float = Field(..., gt=0)
    lead_days: int = Field(default=1, ge=1)
    min_order_quantity: float = Field(default=1.0, gt=0)
    notes: Optional[str] = Field(None, max_length=255)
    is_preferred: bool = False


class SupplierIngredientUpdate(BaseModel):
    """Update supplier-ingredient link"""
    cost_per_unit: Optional[float] = Field(None, gt=0)
    lead_days: Optional[int] = Field(None, ge=1)
    min_order_quantity: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=255)
    is_preferred: Optional[bool] = None


class SupplierIngredientResponse(BaseModel):
    """Supplier-Ingredient relationship response"""
    id: UUID
    supplier_id: UUID
    ingredient_id: UUID
    cost_per_unit: float
    lead_days: int
    min_order_quantity: float
    notes: Optional[str]
    is_preferred: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Purchase Order Schemas
# ============================================

class PurchaseOrderItemCreate(BaseModel):
    """Create a purchase order line item"""
    ingredient_id: UUID
    quantity_ordered: float = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=255)


class PurchaseOrderItemResponse(BaseModel):
    """Purchase order line item response"""
    id: UUID
    purchase_order_id: UUID
    ingredient_id: UUID
    ingredient_name: Optional[str] = None  # Denormalized for display
    quantity_ordered: float
    quantity_received: float
    unit_cost: float
    total_cost: float
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PurchaseOrderCreate(BaseModel):
    """Create a new purchase order"""
    supplier_id: UUID
    items: List[PurchaseOrderItemCreate]
    expected_delivery: Optional[datetime] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    """Purchase order response"""
    id: UUID
    tenant_id: UUID
    supplier_id: UUID
    supplier_name: Optional[str] = None  # Denormalized for display
    status: str
    expected_delivery: Optional[datetime]
    actual_delivery: Optional[datetime]
    subtotal: float
    tax: float
    total: float
    notes: Optional[str]
    items: List[PurchaseOrderItemResponse] = []
    created_at: datetime
    created_by: Optional[UUID]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PurchaseOrderReceiveItem(BaseModel):
    """Receive a line item (partial or full)"""
    item_id: UUID
    quantity_received: float = Field(..., ge=0)


class PurchaseOrderReceive(BaseModel):
    """Receive items from a purchase order"""
    items: List[PurchaseOrderReceiveItem]
    notes: Optional[str] = None


# ============================================
# Procurement Suggestion Schemas
# ============================================

class IngredientSuggestion(BaseModel):
    """Individual ingredient purchase suggestion"""
    ingredient_id: UUID
    ingredient_name: str
    unit: str
    current_stock: float
    predicted_demand_7d: float
    projected_stock: float  # current_stock - predicted_demand
    min_stock_alert: float
    shortage: float  # How much below min_stock (if positive, needs ordering)
    suggested_quantity: float
    preferred_supplier_id: Optional[UUID] = None
    preferred_supplier_name: Optional[str] = None
    unit_cost: float
    estimated_cost: float


class SupplierSuggestion(BaseModel):
    """Suggestions grouped by supplier"""
    supplier_id: UUID
    supplier_name: str
    items: List[IngredientSuggestion]
    estimated_total: float


class ProcurementSuggestionsResponse(BaseModel):
    """Response for procurement suggestions endpoint"""
    generated_at: datetime
    forecast_days: int = 7
    suggestions_by_supplier: List[SupplierSuggestion]
    unassigned_ingredients: List[IngredientSuggestion] = []  # No preferred supplier
    total_estimated_cost: float
    # AI Context
    ai_analysis_summary: Optional[str] = None
    ai_demand_multiplier: float = 1.0
