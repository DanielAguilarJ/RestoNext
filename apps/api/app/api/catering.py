from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import base64

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from pydantic import BaseModel
import io

from app.core.database import get_db
from app.models.models import (
    User, Tenant, EventLead, Event, EventMenuSelection, MenuItem, 
    Recipe, BEO, CateringQuote, LeadStatus, EventStatus, QuoteStatus
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
    
    # Get event
    event = db.query(Event).filter(Event.id == quote.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get client IP
    client_ip = request.headers.get(
        "X-Forwarded-For", 
        request.client.host if request.client else "unknown"
    )
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Store signature data (in a real system, you might save the image to storage)
    # For now, we'll store signature metadata in the quote
    signature_metadata = {
        "signer_name": sign_data.signer_name,
        "signer_email": sign_data.signer_email,
        "signer_phone": sign_data.signer_phone,
        "signed_at": datetime.utcnow().isoformat(),
        "ip_address": client_ip,
        "signature_present": bool(sign_data.signature_data),
        # Note: In production, save signature_data to secure storage
        # and store the reference here instead of the actual data
    }
    
    # Update quote status
    quote.status = QuoteStatus.ACCEPTED
    # We could add a signature_data column to CateringQuote model
    # For now, the status change indicates acceptance
    
    # Update event status to CONFIRMED
    event.status = EventStatus.CONFIRMED
    
    # Update lead status if exists
    if event.lead_id:
        lead = db.query(EventLead).filter(EventLead.id == event.lead_id).first()
        if lead:
            lead.status = LeadStatus.WON
    
    signed_at = datetime.utcnow()
    
    db.commit()
    
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
