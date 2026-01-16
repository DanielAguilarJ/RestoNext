"""
RestoNext MX - Auto-Service / Dining Schemas
Public-facing schemas for customer self-ordering via tablets/QR codes

These schemas are designed to be lightweight and consumer-friendly,
without exposing internal business logic or sensitive data.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# Public Menu Schemas (Consumer-Facing)
# ============================================

class ModifierOptionPublic(BaseModel):
    """Single modifier option visible to customers"""
    id: str
    name: str
    price_delta: float = 0
    description: Optional[str] = None


class ModifierGroupPublic(BaseModel):
    """Modifier group for customer selection"""
    name: str
    required: bool = False
    min_select: Optional[int] = None
    max_select: Optional[int] = None
    options: List[ModifierOptionPublic]


class MenuItemPublic(BaseModel):
    """
    Menu item optimized for customer view.
    - Large images for tablet display
    - AI-enhanced descriptions
    - No internal routing info exposed
    """
    id: UUID
    name: str
    description: Optional[str] = None
    ai_description: Optional[str] = None  # AI-generated appetizing description
    price: float
    image_url: Optional[str] = None
    is_available: bool = True
    modifiers: Optional[List[ModifierGroupPublic]] = None
    # Dietary/allergy tags
    tags: List[str] = []  # ["vegetarian", "gluten-free", "spicy"]
    
    class Config:
        from_attributes = True


class MenuCategoryPublic(BaseModel):
    """Menu category for consumer view"""
    id: UUID
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # Emoji or icon name
    items: List[MenuItemPublic] = []
    
    class Config:
        from_attributes = True


class PublicMenuResponse(BaseModel):
    """Full menu response for dining app"""
    restaurant_name: str
    logo_url: Optional[str] = None
    table_number: int
    categories: List[MenuCategoryPublic]
    currency: str = "MXN"
    # Restaurant settings
    allow_special_requests: bool = True
    show_prices: bool = True


# ============================================
# Self-Service Order Schemas
# ============================================

class SelectedModifierPublic(BaseModel):
    """Modifier selection by customer"""
    group_name: str
    option_id: str
    option_name: str
    price_delta: float = 0


class DiningOrderItemCreate(BaseModel):
    """Single item in a customer's order"""
    menu_item_id: UUID
    quantity: int = Field(default=1, ge=1, le=20)
    selected_modifiers: List[SelectedModifierPublic] = []
    notes: Optional[str] = Field(None, max_length=200)


class DiningOrderCreate(BaseModel):
    """
    Order creation from self-service tablet.
    Note: table_id and tenant_id come from the validated token, not the request body.
    """
    items: List[DiningOrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = Field(None, max_length=500)
    # Optional: customer name for kitchen display
    customer_name: Optional[str] = Field(None, max_length=50)


class DiningOrderItemResponse(BaseModel):
    """Order item in response"""
    id: UUID
    menu_item_name: str
    quantity: int
    unit_price: float
    modifiers: List[dict]
    notes: Optional[str]
    status: str
    
    class Config:
        from_attributes = True


class DiningOrderResponse(BaseModel):
    """Order confirmation for customer"""
    id: UUID
    order_number: str  # Human-readable order number
    table_number: int
    status: str
    items: List[DiningOrderItemResponse]
    subtotal: float
    tax: float
    total: float
    estimated_time_minutes: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class OrderStatusPublic(BaseModel):
    """Real-time order status for customer tracking"""
    order_id: UUID
    status: str  # open, in_progress, ready, delivered
    items: List[dict]  # [{name, status, ready_at}]
    estimated_ready_at: Optional[datetime] = None


# ============================================
# Service Request Schemas
# ============================================

class ServiceRequestCreate(BaseModel):
    """Create a service request (call waiter, request bill, etc.)"""
    request_type: str = Field(..., pattern="^(waiter|bill|refill|custom)$")
    message: Optional[str] = Field(None, max_length=200)


class ServiceRequestResponse(BaseModel):
    """Service request confirmation"""
    id: UUID
    request_type: str
    status: str
    message: Optional[str]
    created_at: datetime
    # Estimated response time based on restaurant load
    estimated_response_minutes: Optional[int] = None
    
    class Config:
        from_attributes = True


class ActiveServiceRequests(BaseModel):
    """Active service requests for a table"""
    requests: List[ServiceRequestResponse]
    has_pending: bool


# ============================================
# Table Session Schemas
# ============================================

class TableSessionInfo(BaseModel):
    """Information about the current table session"""
    table_id: UUID
    table_number: int
    tenant_name: str
    tenant_logo: Optional[str] = None
    is_occupied: bool
    current_order_id: Optional[UUID] = None
    current_order_total: float = 0
    # Features enabled for this table
    can_order: bool = True
    can_call_waiter: bool = True
    can_request_bill: bool = True
    can_view_order_status: bool = True


class TableTokenValidation(BaseModel):
    """Response when validating a table token"""
    valid: bool
    session: Optional[TableSessionInfo] = None
    error: Optional[str] = None


# ============================================
# Bill / Check Schemas (Customer View)
# ============================================

class BillItemPublic(BaseModel):
    """Bill item for customer view"""
    name: str
    quantity: int
    unit_price: float
    modifiers_total: float = 0
    subtotal: float


class BillPublic(BaseModel):
    """Current bill for the table"""
    table_number: int
    items: List[BillItemPublic]
    subtotal: float
    tax: float
    total: float
    currency: str = "MXN"
    # Payment options available
    can_pay_online: bool = False
    payment_methods: List[str] = ["cash", "card"]


# ============================================
# WebSocket Event Schemas
# ============================================

class DiningWebSocketEvent(BaseModel):
    """WebSocket events for real-time updates to tablet"""
    event: str  # order_status_update, bill_update, table_cleared
    payload: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================
# QR Code / Token Schemas
# ============================================

class QRCodeGenerateRequest(BaseModel):
    """Request to generate/regenerate QR code for table"""
    table_id: UUID
    force_regenerate: bool = False


class QRCodeResponse(BaseModel):
    """QR code information for table"""
    table_id: UUID
    table_number: int
    qr_url: str  # Full URL encoded in QR
    token_expires_at: Optional[datetime] = None
    # For generating QR image
    qr_data: str  # Raw data to encode
