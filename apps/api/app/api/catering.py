from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

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

router = APIRouter()

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

