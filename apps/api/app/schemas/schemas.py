"""
RestoNext MX - Pydantic Schemas
Request/Response validation models
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================
# Auth Schemas
# ============================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "waiter"


class UserResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Tenant Schemas
# ============================================

class FiscalConfigSchema(BaseModel):
    """Fiscal configuration for Mexican businesses (legacy)"""
    rfc: str = Field(..., min_length=12, max_length=13)
    razon_social: str
    regimen_fiscal: str
    codigo_postal: str = Field(..., min_length=5, max_length=5)
    csd_certificate_path: Optional[str] = None
    csd_key_path: Optional[str] = None
    pac_provider: Optional[str] = None


class FiscalAddressSchema(BaseModel):
    """Structured fiscal address for CFDI 4.0"""
    street: str = Field(..., min_length=1, max_length=300)
    exterior_number: str = Field(..., min_length=1, max_length=20)
    interior_number: Optional[str] = Field(None, max_length=20)
    neighborhood: str = Field(..., min_length=1, max_length=120)  # Colonia
    city: str = Field(..., min_length=1, max_length=120)
    state: str = Field(..., min_length=1, max_length=120)
    postal_code: str = Field(..., min_length=5, max_length=5)  # CP
    country: str = Field(default="México", max_length=60)


class ContactsSchema(BaseModel):
    """Business contact information"""
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)


class TicketConfigSchema(BaseModel):
    """Ticket/receipt configuration"""
    header_lines: List[str] = Field(default_factory=list)
    footer_lines: List[str] = Field(default_factory=list)
    show_logo: bool = True
    additional_notes: Optional[str] = None


class BillingConfigSchema(BaseModel):
    """PAC/CSD configuration for CFDI stamping"""
    pac_provider: Optional[str] = None  # e.g., "facturapi", "finkok"
    csd_cert_path: Optional[str] = None
    csd_key_path: Optional[str] = None
    csd_password_ref: Optional[str] = None  # Secret reference, not actual password
    series: str = "A"
    folio_start: int = 1


class TenantOnboardingStart(BaseModel):
    """Initial onboarding data - Step 1"""
    trade_name: str = Field(..., min_length=2, max_length=200)
    logo_url: Optional[str] = None


class TenantOnboardingUpdate(BaseModel):
    """Partial update for onboarding steps"""
    trade_name: Optional[str] = Field(None, min_length=2, max_length=200)
    legal_name: Optional[str] = Field(None, min_length=2, max_length=300)
    logo_url: Optional[str] = None
    rfc: Optional[str] = Field(None, min_length=12, max_length=13)
    regimen_fiscal: Optional[str] = Field(None, min_length=3, max_length=3)
    uso_cfdi_default: Optional[str] = Field(None, min_length=3, max_length=3)
    fiscal_address: Optional[FiscalAddressSchema] = None
    contacts: Optional[ContactsSchema] = None
    ticket_config: Optional[TicketConfigSchema] = None
    billing_config: Optional[BillingConfigSchema] = None
    onboarding_step: Optional[str] = None


class TenantCreate(BaseModel):
    name: str
    slug: str
    fiscal_config: FiscalConfigSchema


class TenantPublic(BaseModel):
    """Full tenant profile for authenticated users"""
    id: UUID
    name: str
    slug: str
    legal_name: Optional[str]
    trade_name: Optional[str]
    logo_url: Optional[str]
    rfc: Optional[str]
    regimen_fiscal: Optional[str]
    uso_cfdi_default: str
    fiscal_address: dict
    contacts: dict
    ticket_config: dict
    billing_config: dict
    timezone: str
    currency: str
    locale: str
    onboarding_complete: bool
    onboarding_step: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TenantResponse(BaseModel):
    """Brief tenant response (legacy)"""
    id: UUID
    name: str
    slug: str
    fiscal_config: dict
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Menu Schemas
# ============================================

class ModifierOptionSchema(BaseModel):
    id: str
    name: str
    price_delta: float = 0


class ModifierGroupSchema(BaseModel):
    name: str
    required: bool = False
    min_select: Optional[int] = None
    max_select: Optional[int] = None
    options: List[ModifierOptionSchema]


class ModifiersSchema(BaseModel):
    groups: List[ModifierGroupSchema]


class MenuItemCreate(BaseModel):
    category_id: UUID
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    route_to: str = "kitchen"
    modifiers_schema: Optional[ModifiersSchema] = None


class MenuItemResponse(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    description: Optional[str]
    price: float
    image_url: Optional[str]
    route_to: str
    modifiers_schema: Optional[dict]
    is_available: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MenuCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0


class MenuCategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    sort_order: int
    is_active: bool
    items: Optional[List[MenuItemResponse]] = None
    
    class Config:
        from_attributes = True


# ============================================
# Order Schemas
# ============================================

class SelectedModifierSchema(BaseModel):
    group_name: str
    option_id: str
    option_name: str
    price_delta: float


class OrderItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = 1
    selected_modifiers: List[SelectedModifierSchema] = []
    seat_number: Optional[int] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    menu_item_id: UUID
    menu_item_name: str
    quantity: int
    unit_price: float
    selected_modifiers: list
    seat_number: Optional[int]
    notes: Optional[str]
    status: str
    route_to: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    table_id: UUID
    items: List[OrderItemCreate]
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    table_id: UUID
    waiter_id: UUID
    status: str
    subtotal: float
    tax: float
    total: float
    notes: Optional[str]
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Bill Split Schemas
# ============================================

class SplitDetailSchema(BaseModel):
    split_number: int
    item_ids: List[str]
    amount: float
    paid: bool = False
    payment_method: Optional[str] = None


class BillSplitCreate(BaseModel):
    order_id: UUID
    split_type: str  # by_seat, even, custom
    splits: List[SplitDetailSchema]


class BillSplitResponse(BaseModel):
    id: UUID
    order_id: UUID
    split_type: str
    splits: list
    created_at: datetime
    
    class Config:
        from_attributes = True


class PartialPaymentRequest(BaseModel):
    """Request for paying a portion of a split check"""
    split_number: int
    amount: float
    payment_method: str  # cash, card, transfer


# ============================================
# Invoice / CFDI Schemas
# ============================================

class SelfInvoiceRequest(BaseModel):
    """
    Request for customer self-invoicing (autofactura).
    RFC and name will be validated against SAT rules.
    """
    order_id: UUID
    receptor_rfc: str = Field(..., min_length=12, max_length=13)
    receptor_nombre: str
    receptor_cp: str = Field(..., min_length=5, max_length=5)
    uso_cfdi: str = "G03"  # Gastos en general


class InvoiceResponse(BaseModel):
    id: UUID
    order_id: UUID
    uuid: Optional[str]
    status: str
    receptor_rfc: str
    receptor_nombre: str
    subtotal: float
    iva: float
    total: float
    pdf_url: Optional[str]
    xml_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Table Schemas
# ============================================

class TableCreate(BaseModel):
    number: int
    capacity: int = 4
    pos_x: int = 0
    pos_y: int = 0


class TableResponse(BaseModel):
    id: UUID
    number: int
    capacity: int
    status: str
    pos_x: int
    pos_y: int
    
    class Config:
        from_attributes = True


class TableStatusUpdate(BaseModel):
    status: str  # free, occupied, bill_requested


# ============================================
# Analytics Schemas
# ============================================

class ForecastRequest(BaseModel):
    ingredient: str
    days_ahead: int = 7


class ForecastResponse(BaseModel):
    ingredient: str
    predictions: List[dict]  # [{date, predicted_demand, lower_bound, upper_bound}]
