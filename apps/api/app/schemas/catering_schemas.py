from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr

# =======================
# Enums (Re-declared for Pydantic if needed, or string validation)
# =======================

# =======================
# Lead Schemas
# =======================

class EventLeadCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=128)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20)
    event_date: Optional[datetime] = None
    guest_count: Optional[int] = Field(None, ge=1)
    event_type: Optional[str] = Field(None, max_length=64)
    notes: Optional[str] = None
    source: Optional[str] = Field(None, max_length=64)

class EventLeadUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=128)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=20)
    event_date: Optional[datetime] = None
    guest_count: Optional[int] = Field(None, ge=1)
    event_type: Optional[str] = None
    status: Optional[str] = None # new, contacted, etc.
    notes: Optional[str] = None

class EventLeadResponse(EventLeadCreate):
    id: UUID
    tenant_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# =======================
# Event Schemas
# =======================

class EventCreate(BaseModel):
    lead_id: Optional[UUID] = None
    name: str = Field(..., max_length=200)
    start_time: datetime
    end_time: datetime
    guest_count: int = Field(..., ge=1)
    location: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    guest_count: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None # draft, confirmed, etc.

class EventMenuSelectionCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = Field(1, ge=1)
    notes: Optional[str] = None

class EventMenuSelectionResponse(BaseModel):
    id: UUID
    event_id: UUID
    menu_item_id: UUID
    item_name: str
    unit_price: float
    quantity: int
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    lead_id: Optional[UUID]
    name: str
    start_time: datetime
    end_time: datetime
    guest_count: int
    location: Optional[str]
    status: str
    total_amount: float
    created_at: datetime
    updated_at: datetime
    menu_selections: List[EventMenuSelectionResponse] = []
    
    class Config:
        from_attributes = True

# =======================
# BEO Schemas
# =======================

class BEOCreate(BaseModel):
    schedule: List[Dict[str, Any]] = [] # [{"time": "...", "activity": "..."}]
    setup_instructions: Dict[str, Any] = {}
    internal_notes: Optional[str] = None

class BEOResponse(BaseModel):
    id: UUID
    event_id: UUID
    schedule: List[Dict[str, Any]]
    setup_instructions: Dict[str, Any]
    internal_notes: Optional[str]
    version: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

# =======================
# Quote Schemas
# =======================

class CateringQuoteCreate(BaseModel):
    valid_until: datetime

class CateringQuoteResponse(BaseModel):
    id: UUID
    event_id: UUID
    valid_until: datetime
    status: str
    public_token: str
    subtotal: float
    tax: float
    total: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# =======================
# AI Schemas
# =======================

class AICateringProposalRequest(BaseModel):
    event_type: str = Field(..., example="Wedding")
    guest_count: int = Field(..., ge=1)
    budget_per_person: float = Field(..., gt=0)
    theme: str = Field(..., example="Vintage Garden")

class AICateringProposalResponse(BaseModel):
    suggested_menu: List[Dict[str, Any]]
    sales_pitch: str
