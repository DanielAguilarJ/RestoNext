from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import base64
import os

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from pydantic import BaseModel
import io

from app.core.database import get_db
from app.models.models import (
    User, Tenant, EventLead, Event, EventMenuSelection, MenuItem, 
    Recipe, BEO, CateringQuote, CateringPackage, LeadStatus, EventStatus, QuoteStatus
)
from app.core.security import get_current_user
from app.schemas.catering_schemas import (
    EventLeadCreate, EventLeadUpdate, EventLeadResponse,
    EventCreate, EventUpdate, EventResponse,
    EventMenuSelectionCreate, BEOCreate, BEOResponse,
    CateringQuoteCreate, CateringQuoteResponse,
    AICateringProposalRequest, AICateringProposalResponse
)
from app.services.ai_service import AIService
from app.services.pdf_service import pdf_service
from app.services.email_service import get_email_service

# Stripe SDK (graceful import)
try:
    import stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    if STRIPE_SECRET_KEY:
        stripe.api_key = STRIPE_SECRET_KEY
        STRIPE_ENABLED = True
    else:
        STRIPE_ENABLED = False
except ImportError:
    stripe = None
    STRIPE_ENABLED = False


router = APIRouter()


# ==========================================
# Additional Schemas for Signing
# ==========================================

class ProposalSignRequest(BaseModel):
    """Request body for signing a proposal"""
    signature_data: str  # Base64 encoded signature image
    signer_name: str
    signer_email: Optional[str] = None
    signer_phone: Optional[str] = None
    accepted_terms: bool = True


class ProposalSignResponse(BaseModel):
    """Response after successful signing"""
    success: bool
    event_id: str
    event_status: str
    message: str
    signed_at: datetime


class PublicProposalResponse(BaseModel):
    """Public proposal data for the portal"""
    quote_id: str
    event_name: str
    event_date: Optional[datetime]
    guest_count: int
    location: Optional[str]
    client_name: str
    menu_items: List[dict]
    subtotal: float
    tax: float
    total: float
    valid_until: datetime
    status: str
    tenant_name: str
    tenant_logo: Optional[str]


class ProductionSheetItem(BaseModel):
    """Individual item in production sheet"""
    ingredient_id: str
    name: str
    quantity: float
    unit: str


class ProductionSheetResponse(BaseModel):
    """Production sheet response"""
    event_id: str
    event_name: str
    event_date: Optional[datetime]
    guest_count: int
    production_list: List[ProductionSheetItem]

# ==========================================
# Leads
# ==========================================

@router.post("/leads", response_model=EventLeadResponse)
def create_lead(
    lead_in: EventLeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = EventLead(
        **lead_in.model_dump(),
        tenant_id=current_user.tenant_id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.get("/leads", response_model=List[EventLeadResponse])
def get_leads(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(EventLead).where(EventLead.tenant_id == current_user.tenant_id)
    if status:
        query = query.where(EventLead.status == status)
    
    leads = db.execute(query.offset(skip).limit(limit)).scalars().all()
    return leads


@router.get("/leads/{lead_id}", response_model=EventLeadResponse)
def get_lead(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific lead by ID."""
    lead = db.query(EventLead).filter(
        EventLead.id == lead_id, 
        EventLead.tenant_id == current_user.tenant_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    return lead


@router.patch("/leads/{lead_id}/status", response_model=EventLeadResponse)
def update_lead_status(
    lead_id: uuid.UUID,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update lead status (for Kanban drag-and-drop).
    Valid statuses: new, contacted, proposal_sent, negotiation, quoting, won, lost
    """
    lead = db.query(EventLead).filter(
        EventLead.id == lead_id, 
        EventLead.tenant_id == current_user.tenant_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    # Validate status against LeadStatus enum
    valid_statuses = ["new", "contacted", "proposal_sent", "negotiation", "quoting", "won", "lost"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    lead.status = new_status
    db.commit()
    db.refresh(lead)
    
    return lead


@router.post("/leads/{lead_id}/convert", response_model=EventResponse)
def convert_lead_to_event(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(EventLead).filter(
        EventLead.id == lead_id, 
        EventLead.tenant_id == current_user.tenant_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    start_time = lead.event_date or datetime.utcnow() + timedelta(days=7)
    end_time = start_time + timedelta(hours=4)
    
    event = Event(
        tenant_id=current_user.tenant_id,
        lead_id=lead.id,
        name=f"Event for {lead.client_name}",
        start_time=start_time,
        end_time=end_time,
        guest_count=lead.guest_count or 0,
        status=EventStatus.DRAFT
    )
    
    lead.status = LeadStatus.WON
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

# ==========================================
# Events
# ==========================================

@router.post("/events", response_model=EventResponse)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = Event(
        **event_in.model_dump(),
        tenant_id=current_user.tenant_id,
        status=EventStatus.DRAFT
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/events", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.execute(
        select(Event)
        .where(Event.tenant_id == current_user.tenant_id)
        .options(joinedload(Event.menu_selections))
        .offset(skip).limit(limit)
    ).unique().scalars().all()
    return events

@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.execute(
        select(Event)
        .where(Event.id == event_id, Event.tenant_id == current_user.tenant_id)
        .options(joinedload(Event.menu_selections))
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: uuid.UUID,
    event_in: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing event."""
    event = db.query(Event).filter(
        Event.id == event_id, 
        Event.tenant_id == current_user.tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    return get_event(event_id, db, current_user)


@router.patch("/events/{event_id}/status", response_model=EventResponse)
def update_event_status(
    event_id: uuid.UUID,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update event status (draft, confirmed, cancelled, completed)."""
    event = db.query(Event).filter(
        Event.id == event_id, 
        Event.tenant_id == current_user.tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    valid_statuses = ["draft", "confirmed", "cancelled", "completed"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    event.status = new_status
    db.commit()
    db.refresh(event)
    return get_event(event_id, db, current_user)


@router.delete("/events/{event_id}")
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an event and all its related data."""
    event = db.query(Event).filter(
        Event.id == event_id, 
        Event.tenant_id == current_user.tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete related data first (menu selections, BEO, quote, etc.)
    db.query(EventMenuSelection).filter(EventMenuSelection.event_id == event_id).delete()
    db.query(BEO).filter(BEO.event_id == event_id).delete()
    db.query(CateringQuote).filter(CateringQuote.event_id == event_id).delete()
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully", "id": str(event_id)}


# ==========================================
# Event Menu & Logic
# ==========================================


@router.post("/events/{event_id}/items", response_model=EventResponse)
def add_menu_item_to_event(
    event_id: uuid.UUID,
    selection_in: EventMenuSelectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id, 
        Event.tenant_id == current_user.tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    menu_item = db.query(MenuItem).filter(MenuItem.id == selection_in.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu Item not found")
        
    selection = EventMenuSelection(
        event_id=event.id,
        menu_item_id=menu_item.id,
        item_name=menu_item.name,
        unit_price=menu_item.price, # Lock price at selection time
        quantity=selection_in.quantity,
        notes=selection_in.notes
    )
    
    event.total_amount += (menu_item.price * selection_in.quantity)
    
    db.add(selection)
    db.commit()
    db.refresh(event)
    # Re-fetch with relationships
    return get_event(event_id, db, current_user)

@router.get("/events/{event_id}/production-list")
def get_production_list(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculates total ingredient requirements for the event.
    Multiplies (EventMenuSelection.quantity * Recipe.quantity).
    """
    event = db.execute(
        select(Event)
        .where(Event.id == event_id, Event.tenant_id == current_user.tenant_id)
        .options(
            joinedload(Event.menu_selections).joinedload(EventMenuSelection.menu_item).joinedload(MenuItem.recipes).joinedload(Recipe.ingredient)
        )
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    production_list = {}
    
    for selection in event.menu_selections:
        qty_needed = selection.quantity
        
        for recipe in selection.menu_item.recipes:
            ingredient_name = recipe.ingredient.name
            total_ingredient_needed = recipe.quantity * qty_needed
            unit = recipe.unit
            
            if ingredient_name in production_list:
                production_list[ingredient_name]["quantity"] += total_ingredient_needed
            else:
                production_list[ingredient_name] = {
                    "ingredient_id": str(recipe.ingredient_id),
                    "name": ingredient_name,
                    "quantity": total_ingredient_needed,
                    "unit": unit
                }
                
    return {"event_id": str(event.id), "production_list": list(production_list.values())}

# ==========================================
# Quotes & BEOs
# ==========================================

@router.post("/events/{event_id}/beo", response_model=BEOResponse)
def create_or_update_beo(
    event_id: uuid.UUID,
    beo_in: BEOCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id, Event.tenant_id == current_user.tenant_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    beo = db.query(BEO).filter(BEO.event_id == event_id).first()
    
    if beo:
        beo.schedule = beo_in.schedule
        beo.setup_instructions = beo_in.setup_instructions
        beo.internal_notes = beo_in.internal_notes
        beo.version += 1
    else:
        beo = BEO(
            event_id=event_id,
            tenant_id=current_user.tenant_id,
            schedule=beo_in.schedule,
            setup_instructions=beo_in.setup_instructions,
            internal_notes=beo_in.internal_notes
        )
        db.add(beo)
        
    db.commit()
    db.refresh(beo)
    return beo

@router.post("/events/{event_id}/quote", response_model=CateringQuoteResponse)
def generate_quote(
    event_id: uuid.UUID,
    quote_in: CateringQuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id, Event.tenant_id == current_user.tenant_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Calculate totals
    subtotal = event.total_amount
    tax = subtotal * 0.16 # Default IVA logic - could be improved with TaxConfig
    total = subtotal + tax
    
    quote = CateringQuote(
        event_id=event.id,
        tenant_id=current_user.tenant_id,
        valid_until=quote_in.valid_until,
        status=QuoteStatus.DRAFT,
        subtotal=subtotal,
        tax=tax,
        total=total
    )
    
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


@router.post("/events/ai-proposal", response_model=AICateringProposalResponse)
async def generate_ai_catering_proposal(
    request: AICateringProposalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Expert AI Catering Planner.
    Analyzes trends and proposes a menu using current inventory items.
    """
    # 1. Fetch Tenant Location
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    location = "Mexico, CDMX"
    if tenant and tenant.fiscal_address and isinstance(tenant.fiscal_address, dict):
        location = f"{tenant.fiscal_address.get('city', '')}, {tenant.fiscal_address.get('state', '')}"

    # 2. Get Current Menu Items for Context
    menu_items_res = db.execute(
        select(MenuItem.name).where(MenuItem.tenant_id == current_user.tenant_id, MenuItem.is_available == True)
    )
    available_items = [r[0] for r in menu_items_res.all()]

    # 3. Call AI Service
    ai_service = AIService()
    proposal = await ai_service.plan_catering_event(
        event_type=request.event_type,
        guest_count=request.guest_count,
        budget_per_person=request.budget_per_person,
        theme=request.theme,
        location=location,
        available_menu_items=available_items
    )
    
    return proposal


# ==========================================
# PDF Generation Endpoints
# ==========================================

@router.get("/events/{event_id}/proposal/pdf")
def generate_proposal_pdf(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a professional PDF proposal for the event.
    Returns the PDF as a downloadable file.
    """
    # Fetch event with relationships
    event = db.execute(
        select(Event)
        .where(Event.id == event_id, Event.tenant_id == current_user.tenant_id)
        .options(
            joinedload(Event.menu_selections),
            joinedload(Event.lead),
            joinedload(Event.quotes)
        )
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get tenant data
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    
    # Get the latest quote for this event
    quote = db.query(CateringQuote).filter(
        CateringQuote.event_id == event_id
    ).order_by(CateringQuote.created_at.desc()).first()
    
    if not quote:
        raise HTTPException(
            status_code=400, 
            detail="No quote exists for this event. Create a quote first."
        )
    
    # Prepare data dictionaries
    tenant_data = {
        'name': tenant.name if tenant else 'RestoNext',
        'legal_name': tenant.legal_name if tenant else None,
        'trade_name': tenant.trade_name if tenant else None,
        'rfc': tenant.rfc if tenant else None,
        'logo_url': tenant.logo_url if tenant else None,
        'fiscal_address': tenant.fiscal_address if tenant else {},
        'contacts': tenant.contacts if tenant else {},
    }
    
    event_data = {
        'name': event.name,
        'start_time': event.start_time,
        'end_time': event.end_time,
        'guest_count': event.guest_count,
        'location': event.location,
        'status': event.status.value if hasattr(event.status, 'value') else str(event.status),
    }
    
    lead_data = {}
    if event.lead:
        lead_data = {
            'client_name': event.lead.client_name,
            'contact_email': event.lead.contact_email,
            'contact_phone': event.lead.contact_phone,
        }
    else:
        lead_data = {
            'client_name': event.name.split(' for ')[-1] if ' for ' in event.name else 'Cliente',
            'contact_email': '',
            'contact_phone': '',
        }
    
    menu_selections = [
        {
            'item_name': sel.item_name,
            'unit_price': sel.unit_price,
            'quantity': sel.quantity,
            'notes': sel.notes,
        }
        for sel in event.menu_selections
    ]
    
    quote_data = {
        'id': str(quote.id),
        'valid_until': quote.valid_until,
        'subtotal': quote.subtotal,
        'tax': quote.tax,
        'total': quote.total,
        'public_token': quote.public_token,
        'status': quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
    }
    
    # Generate PDF
    pdf_bytes = pdf_service.generate_proposal_pdf(
        tenant_data=tenant_data,
        event_data=event_data,
        lead_data=lead_data,
        menu_selections=menu_selections,
        quote_data=quote_data,
    )
    
    # Update quote status to SENT
    if quote.status == QuoteStatus.DRAFT:
        quote.status = QuoteStatus.SENT
        db.commit()
    
    # Return as downloadable PDF
    filename = f"propuesta_{event.name.replace(' ', '_')[:30]}_{str(event_id)[:8]}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/events/{event_id}/production-sheet/pdf")
def generate_production_sheet_pdf(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a production sheet PDF for kitchen prep.
    Includes all ingredients needed for the event.
    """
    # Get event with full production data
    event = db.execute(
        select(Event)
        .where(Event.id == event_id, Event.tenant_id == current_user.tenant_id)
        .options(
            joinedload(Event.menu_selections)
            .joinedload(EventMenuSelection.menu_item)
            .joinedload(MenuItem.recipes)
            .joinedload(Recipe.ingredient)
        )
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get tenant
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    
    # Calculate production list
    production_list = {}
    
    for selection in event.menu_selections:
        qty_needed = selection.quantity
        
        if selection.menu_item and selection.menu_item.recipes:
            for recipe in selection.menu_item.recipes:
                if recipe.ingredient:
                    ingredient_name = recipe.ingredient.name
                    total_ingredient_needed = recipe.quantity * qty_needed
                    unit = recipe.unit.value if hasattr(recipe.unit, 'value') else str(recipe.unit)
                    
                    if ingredient_name in production_list:
                        production_list[ingredient_name]["quantity"] += total_ingredient_needed
                    else:
                        production_list[ingredient_name] = {
                            "ingredient_id": str(recipe.ingredient_id),
                            "name": ingredient_name,
                            "quantity": total_ingredient_needed,
                            "unit": unit
                        }
    
    # Prepare data
    tenant_data = {
        'name': tenant.name if tenant else 'RestoNext',
        'legal_name': tenant.legal_name if tenant else None,
        'trade_name': tenant.trade_name if tenant else None,
        'fiscal_address': tenant.fiscal_address if tenant else {},
        'contacts': tenant.contacts if tenant else {},
    }
    
    event_data = {
        'name': event.name,
        'start_time': event.start_time,
        'guest_count': event.guest_count,
    }
    
    # Generate PDF
    pdf_bytes = pdf_service.generate_production_sheet_pdf(
        tenant_data=tenant_data,
        event_data=event_data,
        production_list=list(production_list.values())
    )
    
    filename = f"produccion_{event.name.replace(' ', '_')[:30]}_{str(event_id)[:8]}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ==========================================
# Public Portal Endpoints (No Auth Required)
# ==========================================

@router.get("/proposals/{token}", response_model=PublicProposalResponse)
def get_public_proposal(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get proposal details by public token.
    This is a PUBLIC endpoint for the client portal.
    """
    # Find quote by token
    quote = db.query(CateringQuote).filter(
        CateringQuote.public_token == token
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Check if expired
    if quote.valid_until < datetime.utcnow():
        quote.status = QuoteStatus.EXPIRED
        db.commit()
    
    # Get event with relationships
    event = db.execute(
        select(Event)
        .where(Event.id == quote.event_id)
        .options(
            joinedload(Event.menu_selections),
            joinedload(Event.lead)
        )
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get tenant info
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    
    # Update status to VIEWED if it was SENT
    if quote.status == QuoteStatus.SENT:
        quote.status = QuoteStatus.VIEWED
        db.commit()
    
    # Prepare menu items
    menu_items = [
        {
            'name': sel.item_name,
            'unit_price': sel.unit_price,
            'quantity': sel.quantity,
            'notes': sel.notes,
            'subtotal': sel.unit_price * sel.quantity
        }
        for sel in event.menu_selections
    ]
    
    # Get client name
    client_name = 'Cliente'
    if event.lead:
        client_name = event.lead.client_name
    
    return PublicProposalResponse(
        quote_id=str(quote.id),
        event_name=event.name,
        event_date=event.start_time,
        guest_count=event.guest_count,
        location=event.location,
        client_name=client_name,
        menu_items=menu_items,
        subtotal=quote.subtotal,
        tax=quote.tax,
        total=quote.total,
        valid_until=quote.valid_until,
        status=quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
        tenant_name=tenant.trade_name or tenant.name if tenant else 'RestoNext',
        tenant_logo=tenant.logo_url if tenant else None
    )


@router.get("/proposals/{token}/pdf")
def get_public_proposal_pdf(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get the proposal PDF by public token.
    This is a PUBLIC endpoint for the client portal.
    """
    # Find quote and verify
    quote = db.query(CateringQuote).filter(
        CateringQuote.public_token == token
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Get event with all relationships
    event = db.execute(
        select(Event)
        .where(Event.id == quote.event_id)
        .options(
            joinedload(Event.menu_selections),
            joinedload(Event.lead)
        )
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get tenant
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    
    # Prepare data (same as authenticated endpoint)
    tenant_data = {
        'name': tenant.name if tenant else 'RestoNext',
        'legal_name': tenant.legal_name if tenant else None,
        'trade_name': tenant.trade_name if tenant else None,
        'rfc': tenant.rfc if tenant else None,
        'logo_url': tenant.logo_url if tenant else None,
        'fiscal_address': tenant.fiscal_address if tenant else {},
        'contacts': tenant.contacts if tenant else {},
    }
    
    event_data = {
        'name': event.name,
        'start_time': event.start_time,
        'end_time': event.end_time,
        'guest_count': event.guest_count,
        'location': event.location,
    }
    
    lead_data = {}
    if event.lead:
        lead_data = {
            'client_name': event.lead.client_name,
            'contact_email': event.lead.contact_email,
            'contact_phone': event.lead.contact_phone,
        }
    else:
        lead_data = {
            'client_name': 'Cliente',
            'contact_email': '',
            'contact_phone': '',
        }
    
    menu_selections = [
        {
            'item_name': sel.item_name,
            'unit_price': sel.unit_price,
            'quantity': sel.quantity,
            'notes': sel.notes,
        }
        for sel in event.menu_selections
    ]
    
    quote_data = {
        'id': str(quote.id),
        'valid_until': quote.valid_until,
        'subtotal': quote.subtotal,
        'tax': quote.tax,
        'total': quote.total,
        'public_token': quote.public_token,
    }
    
    # Generate PDF
    pdf_bytes = pdf_service.generate_proposal_pdf(
        tenant_data=tenant_data,
        event_data=event_data,
        lead_data=lead_data,
        menu_selections=menu_selections,
        quote_data=quote_data,
    )
    
    filename = f"propuesta_{event.name.replace(' ', '_')[:30]}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )


@router.post("/proposals/{token}/sign", response_model=ProposalSignResponse)
def sign_proposal(
    token: str,
    sign_data: ProposalSignRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Sign a proposal and confirm the event.
    This is a PUBLIC endpoint - no authentication required.
    
    The signature is stored as base64 and the event status is updated to CONFIRMED.
    """
    # Find quote
    quote = db.query(CateringQuote).filter(
        CateringQuote.public_token == token
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Check if already accepted
    if quote.status == QuoteStatus.ACCEPTED:
        raise HTTPException(
            status_code=400, 
            detail="This proposal has already been signed"
        )
    
    # Check if expired
    if quote.valid_until < datetime.utcnow():
        quote.status = QuoteStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="This proposal has expired. Please contact us for a new quote."
        )
    
    # Validate terms acceptance
    if not sign_data.accepted_terms:
        raise HTTPException(
            status_code=400,
            detail="You must accept the terms and conditions to sign"
        )
    
    # Get event with lead
    event = db.execute(
        select(Event)
        .where(Event.id == quote.event_id)
        .options(joinedload(Event.lead))
    ).unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get tenant for email
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    
    # Get client IP
    client_ip = request.headers.get(
        "X-Forwarded-For", 
        request.client.host if request.client else "unknown"
    )
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    signed_at = datetime.utcnow()
    
    # Build signature metadata and save to model
    signature_metadata = {
        "signer_name": sign_data.signer_name,
        "signer_email": sign_data.signer_email,
        "signer_phone": sign_data.signer_phone,
        "signed_at": signed_at.isoformat(),
        "ip_address": client_ip,
        "signature_present": bool(sign_data.signature_data),
        "user_agent": request.headers.get("User-Agent", "unknown")[:500],
    }
    
    # Update quote with signature data
    quote.status = QuoteStatus.ACCEPTED
    quote.signature_data = signature_metadata
    quote.signed_at = signed_at
    
    # Calculate deposit amount
    quote.deposit_amount = quote.total * (quote.deposit_percentage / 100)
    
    # Update event status to CONFIRMED
    event.status = EventStatus.CONFIRMED
    
    # Update lead status if exists
    if event.lead_id:
        lead = db.query(EventLead).filter(EventLead.id == event.lead_id).first()
        if lead:
            lead.status = LeadStatus.WON
    
    db.commit()
    
    # ==== AUTOMATED EMAIL NOTIFICATIONS ====
    # Send emails in background to not block response
    try:
        email_service = get_email_service()
        
        # Prepare email data
        client_email = sign_data.signer_email or (event.lead.contact_email if event.lead else None)
        client_name = sign_data.signer_name
        tenant_name = tenant.trade_name or tenant.name if tenant else "RestoNext"
        manager_email = tenant.contacts.get("email") if tenant and tenant.contacts else None
        
        # Email to Client: "Here's your signed contract"
        if client_email and email_service.enabled:
            import asyncio
            asyncio.create_task(email_service.send_email(
                to=[client_email],
                subject=f"✅ Contrato Firmado - {event.name}",
                template_name="proposal_signed_client.html",
                template_data={
                    "client_name": client_name,
                    "event_name": event.name,
                    "event_date": event.start_time.strftime("%d/%m/%Y") if event.start_time else "Por confirmar",
                    "guest_count": event.guest_count,
                    "total_amount": f"${quote.total:,.2f}",
                    "deposit_amount": f"${quote.deposit_amount:,.2f}",
                    "deposit_percentage": int(quote.deposit_percentage),
                    "tenant_name": tenant_name,
                    "portal_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/portal/proposal/{quote.public_token}",
                    "year": "2026"
                }
            ))
        
        # Email to Manager: "New event confirmed!"
        if manager_email and email_service.enabled:
            import asyncio
            asyncio.create_task(email_service.send_email(
                to=[manager_email],
                subject=f"🎉 ¡Nuevo Evento Confirmado! {event.name}",
                template_name="event_confirmed_manager.html",
                template_data={
                    "manager_name": "Equipo",
                    "client_name": client_name,
                    "event_name": event.name,
                    "event_date": event.start_time.strftime("%d/%m/%Y %H:%M") if event.start_time else "Por confirmar",
                    "guest_count": event.guest_count,
                    "location": event.location or "Por confirmar",
                    "total_amount": f"${quote.total:,.2f}",
                    "deposit_amount": f"${quote.deposit_amount:,.2f}",
                    "signed_by": client_name,
                    "signed_at": signed_at.strftime("%d/%m/%Y %H:%M"),
                    "year": "2026"
                }
            ))
    except Exception as e:
        # Don't fail the signing just because email failed
        import logging
        logging.getLogger("catering").warning(f"Email notification failed: {e}")
    
    return ProposalSignResponse(
        success=True,
        event_id=str(event.id),
        event_status="confirmed",
        message=f"¡Gracias {sign_data.signer_name}! Tu evento ha sido confirmado exitosamente.",
        signed_at=signed_at
    )


# ==========================================
# Calendar Events Endpoint
# ==========================================

@router.get("/calendar/events")
def get_calendar_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get events formatted for calendar display.
    Returns events with color coding based on status.
    """
    query = select(Event).where(Event.tenant_id == current_user.tenant_id)
    
    # Date filtering
    if start_date:
        query = query.where(Event.start_time >= start_date)
    if end_date:
        query = query.where(Event.end_time <= end_date)
    
    events = db.execute(
        query.options(joinedload(Event.lead))
    ).unique().scalars().all()
    
    # Status to color mapping
    status_colors = {
        EventStatus.DRAFT: '#6B7280',      # Gray
        EventStatus.CONFIRMED: '#10B981',   # Green
        EventStatus.BOOKED: '#F59E0B',       # Gold/Amber - Deposit paid
        EventStatus.IN_PROGRESS: '#3B82F6', # Blue
        EventStatus.COMPLETED: '#8B5CF6',   # Purple
        EventStatus.CANCELLED: '#EF4444',   # Red
    }
    
    calendar_events = []
    for event in events:
        status = event.status
        color = status_colors.get(status, '#6B7280')
        
        client_name = ''
        if event.lead:
            client_name = event.lead.client_name
        
        calendar_events.append({
            'id': str(event.id),
            'title': event.name,
            'start': event.start_time.isoformat(),
            'end': event.end_time.isoformat(),
            'status': status.value if hasattr(status, 'value') else str(status),
            'color': color,
            'backgroundColor': color,
            'borderColor': color,
            'extendedProps': {
                'guest_count': event.guest_count,
                'location': event.location,
                'client_name': client_name,
                'total_amount': event.total_amount,
            }
        })
    
    return {"events": calendar_events}


# ==========================================
# Stripe Payment Integration
# ==========================================

class DepositPaymentRequest(BaseModel):
    """Request for creating a payment intent for deposit"""
    pass  # Token in path, no body needed


class DepositPaymentResponse(BaseModel):
    """Response with Stripe client secret"""
    client_secret: str
    amount: float
    currency: str
    deposit_percentage: float
    payment_intent_id: str


class ConfirmPaymentRequest(BaseModel):
    """Request to confirm payment completion"""
    payment_intent_id: str


class ConfirmPaymentResponse(BaseModel):
    """Response after payment confirmation"""
    success: bool
    event_id: str
    event_status: str
    message: str


@router.post("/proposals/{token}/pay-deposit", response_model=DepositPaymentResponse)
def create_deposit_payment_intent(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Create a Stripe PaymentIntent for the deposit amount.
    PUBLIC endpoint - called after signing.
    
    Returns client_secret for Stripe Elements to complete payment.
    """
    if not STRIPE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Payment processing is not configured. Please contact support."
        )
    
    # Find quote
    quote = db.query(CateringQuote).filter(
        CateringQuote.public_token == token
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Must be accepted (signed) before paying
    if quote.status != QuoteStatus.ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail="This proposal must be signed before payment"
        )
    
    # Already paid?
    if quote.deposit_paid:
        raise HTTPException(
            status_code=400,
            detail="Deposit has already been paid"
        )
    
    # Calculate deposit amount (in centavos for Stripe)
    deposit_amount = quote.total * (quote.deposit_percentage / 100)
    amount_centavos = int(deposit_amount * 100)
    
    # Get event name for description
    event = db.query(Event).filter(Event.id == quote.event_id).first()
    event_name = event.name if event else "Catering Event"
    
    # Get tenant for Stripe account (if using Connect)
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    
    try:
        # Create PaymentIntent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_centavos,
            currency="mxn",
            description=f"Anticipo {int(quote.deposit_percentage)}% - {event_name}",
            metadata={
                "quote_id": str(quote.id),
                "event_id": str(quote.event_id),
                "tenant_id": str(quote.tenant_id),
                "deposit_percentage": str(quote.deposit_percentage),
            },
            automatic_payment_methods={"enabled": True},
        )
        
        # Store payment intent ID
        quote.stripe_payment_intent_id = payment_intent.id
        db.commit()
        
        return DepositPaymentResponse(
            client_secret=payment_intent.client_secret,
            amount=deposit_amount,
            currency="MXN",
            deposit_percentage=quote.deposit_percentage,
            payment_intent_id=payment_intent.id
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Payment processing error: {str(e)}"
        )


@router.post("/proposals/{token}/confirm-payment", response_model=ConfirmPaymentResponse)
def confirm_deposit_payment(
    token: str,
    payment_data: ConfirmPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm that payment was successful and update event status to BOOKED.
    Called by frontend after Stripe Elements confirms payment.
    """
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=503, detail="Payment not configured")
    
    quote = db.query(CateringQuote).filter(
        CateringQuote.public_token == token
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Verify payment intent matches
    if quote.stripe_payment_intent_id != payment_data.payment_intent_id:
        raise HTTPException(status_code=400, detail="Payment intent mismatch")
    
    try:
        # Verify payment status with Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_data.payment_intent_id)
        
        if payment_intent.status != "succeeded":
            raise HTTPException(
                status_code=400,
                detail=f"Payment not completed. Status: {payment_intent.status}"
            )
        
        # Update quote as paid
        quote.deposit_paid = True
        quote.paid_at = datetime.utcnow()
        
        # Update event status to BOOKED
        event = db.query(Event).filter(Event.id == quote.event_id).first()
        if event:
            event.status = EventStatus.BOOKED
        
        db.commit()
        
        return ConfirmPaymentResponse(
            success=True,
            event_id=str(event.id) if event else "",
            event_status="booked",
            message="¡Pago confirmado! Tu fecha ha sido reservada."
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Catering Packages (Bundles)
# ==========================================

class CateringPackageCreate(BaseModel):
    """Create a new catering package"""
    name: str
    description: Optional[str] = None
    items: List[dict]  # [{menu_item_id, name, quantity, unit_price}]
    base_price_per_person: float
    min_guests: int = 20
    max_guests: Optional[int] = None
    category: Optional[str] = None


class CateringPackageResponse(BaseModel):
    """Package response"""
    id: str
    name: str
    description: Optional[str]
    items: List[dict]
    base_price_per_person: float
    min_guests: int
    max_guests: Optional[int]
    category: Optional[str]
    is_active: bool


class ApplyPackageRequest(BaseModel):
    """Apply a package to an event"""
    package_id: str


@router.get("/packages", response_model=List[CateringPackageResponse])
def list_packages(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all active catering packages for this tenant."""
    query = select(CateringPackage).where(
        CateringPackage.tenant_id == current_user.tenant_id,
        CateringPackage.is_active == True
    )
    
    if category:
        query = query.where(CateringPackage.category == category)
    
    packages = db.execute(query).scalars().all()
    
    return [
        CateringPackageResponse(
            id=str(p.id),
            name=p.name,
            description=p.description,
            items=p.items or [],
            base_price_per_person=p.base_price_per_person,
            min_guests=p.min_guests,
            max_guests=p.max_guests,
            category=p.category,
            is_active=p.is_active
        )
        for p in packages
    ]


@router.post("/packages", response_model=CateringPackageResponse)
def create_package(
    package_in: CateringPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new catering package."""
    package = CateringPackage(
        tenant_id=current_user.tenant_id,
        name=package_in.name,
        description=package_in.description,
        items=package_in.items,
        base_price_per_person=package_in.base_price_per_person,
        min_guests=package_in.min_guests,
        max_guests=package_in.max_guests,
        category=package_in.category
    )
    
    db.add(package)
    db.commit()
    db.refresh(package)
    
    return CateringPackageResponse(
        id=str(package.id),
        name=package.name,
        description=package.description,
        items=package.items or [],
        base_price_per_person=package.base_price_per_person,
        min_guests=package.min_guests,
        max_guests=package.max_guests,
        category=package.category,
        is_active=package.is_active
    )


@router.post("/events/{event_id}/apply-package", response_model=EventResponse)
def apply_package_to_event(
    event_id: uuid.UUID,
    package_request: ApplyPackageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply a catering package to an event.
    This adds all package items to the event's menu selections at once.
    """
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.tenant_id == current_user.tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    package = db.query(CateringPackage).filter(
        CateringPackage.id == package_request.package_id,
        CateringPackage.tenant_id == current_user.tenant_id
    ).first()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check guest count fits package limits
    if event.guest_count < package.min_guests:
        raise HTTPException(
            status_code=400,
            detail=f"This package requires at least {package.min_guests} guests"
        )
    
    if package.max_guests and event.guest_count > package.max_guests:
        raise HTTPException(
            status_code=400,
            detail=f"This package allows maximum {package.max_guests} guests"
        )
    
    # Add package items to event
    total_added = 0
    for item_data in package.items:
        # Calculate quantity based on guest count
        quantity = item_data.get("quantity", 1) * event.guest_count
        unit_price = item_data.get("unit_price", 0)
        
        selection = EventMenuSelection(
            event_id=event.id,
            menu_item_id=uuid.UUID(item_data["menu_item_id"]),
            item_name=item_data.get("name", "Package Item"),
            unit_price=unit_price,
            quantity=quantity,
            notes=f"Del paquete: {package.name}"
        )
        
        event.total_amount += (unit_price * quantity)
        total_added += 1
        db.add(selection)
    
    db.commit()
    db.refresh(event)
    
    return get_event(event_id, db, current_user)


# ==========================================
# Lead Status Update (for Kanban)
# ==========================================

class LeadStatusUpdate(BaseModel):
    """Update lead status"""
    status: str  # new, contacted, proposal_sent, negotiation, quoting, won, lost


@router.patch("/leads/{lead_id}/status", response_model=EventLeadResponse)
def update_lead_status(
    lead_id: uuid.UUID,
    status_update: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a lead's status.
    Used by Kanban drag-and-drop to move leads between columns.
    """
    lead = db.query(EventLead).filter(
        EventLead.id == lead_id,
        EventLead.tenant_id == current_user.tenant_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Validate status
    try:
        new_status = LeadStatus(status_update.status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[s.value for s in LeadStatus]}"
        )
    
    lead.status = new_status
    lead.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(lead)
    
    return lead


@router.get("/leads/{lead_id}", response_model=EventLeadResponse)
def get_lead(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single lead by ID."""
    lead = db.query(EventLead).filter(
        EventLead.id == lead_id,
        EventLead.tenant_id == current_user.tenant_id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead

