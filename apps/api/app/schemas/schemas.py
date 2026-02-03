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


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    email: Optional[str] = None


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

class MenuItemOptimizationResponse(BaseModel):
    suggested_description: str
    market_price_analysis: str


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
    """Order item for creating new orders - flexible to accept string or UUID"""
    menu_item_id: str  # Accept string, will be validated as UUID in business logic
    quantity: int = 1
    selected_modifiers: List[SelectedModifierSchema] = []
    seat_number: Optional[int] = None
    notes: Optional[str] = None
    
    @property
    def menu_item_uuid(self) -> UUID:
        """Convert menu_item_id to UUID"""
        return UUID(self.menu_item_id)


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
    """Create order schema - flexible for POS and self-service"""
    table_id: Optional[str] = None  # Accept string, optional for some flows
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    # Omnichannel
    service_type: str = "dine_in"
    customer_id: Optional[str] = None  # Accept string
    customer_name: Optional[str] = None  # For self-service without customer profile
    delivery_info: Optional[dict] = None
    
    @property
    def table_uuid(self) -> Optional[UUID]:
        """Convert table_id to UUID if present"""
        return UUID(self.table_id) if self.table_id else None
    
    @property
    def customer_uuid(self) -> Optional[UUID]:
        """Convert customer_id to UUID if present"""
        return UUID(self.customer_id) if self.customer_id else None


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
    # Omnichannel
    service_type: str
    customer_id: Optional[UUID]
    delivery_info: Optional[dict]
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
    adjacent_table_ids: List[str] = []
    
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


# ============================================
# Customer & Loyalty Schemas (NEW)
# ============================================

class AddressSchema(BaseModel):
    label: str  # Casa, Trabajo
    address: str
    instructions: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    addresses: List[AddressSchema] = []
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    loyalty_points: float
    wallet_balance: float
    tier_level: str
    annual_spend: float = 0.0
    addresses: List[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoyaltyTransactionResponse(BaseModel):
    id: UUID
    type: str
    points_delta: float
    amount_delta: float
    description: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Reservations & Commissions Schemas (NEW)
# ============================================

class ReservationCreate(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None # Quick create without full customer profile
    agent_id: Optional[UUID] = None
    table_id: Optional[UUID] = None
    reservation_time: datetime
    party_size: int = 2
    deposit_amount: float = 0.0
    notes: Optional[str] = None
    tags: List[str] = []

class ReservationResponse(BaseModel):
    id: UUID
    customer_id: Optional[UUID]
    customer_name: Optional[str] = None  # Resolved from customer relationship
    agent_id: Optional[UUID]
    table_id: Optional[UUID]
    reservation_time: datetime
    party_size: int
    status: str
    deposit_amount: float = 0.0
    payment_status: str = "pending"
    additional_table_ids: Optional[List[str]] = []
    notes: Optional[str]
    tags: List[str]
    
    class Config:
        from_attributes = True


# ============================================
# Promotions Schemas (NEW)
# ============================================

class PromotionRuleSchema(BaseModel):
    days: Optional[List[int]] = None # 0=Mon, 6=Sun
    time_start: Optional[str] = None # "HH:MM"
    time_end: Optional[str] = None
    buy_item_ids: Optional[List[UUID]] = None
    min_qty: Optional[int] = None

class PromotionEffectSchema(BaseModel):
    type: str # discount_percentage, fixed_price, buy_x_get_y
    value: float

class PromotionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules: PromotionRuleSchema
    effect: PromotionEffectSchema
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PromotionResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    rules: dict
    effect: dict
    is_active: bool
    
    class Config:
        from_attributes = True
