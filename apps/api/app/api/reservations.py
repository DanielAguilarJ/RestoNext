from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, Reservation, ReservationStatus, Table, Customer, CommissionAgent
from app.schemas.schemas import ReservationCreate, ReservationResponse

router = APIRouter()

@router.get("/", response_model=List[ReservationResponse])
async def list_reservations(
    date: Optional[datetime] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Reservation).where(Reservation.tenant_id == current_user.tenant_id)
    
    if date:
        # Simple date filtering - assumes full datetime matching or use better date range logic in real app
        # For now, matching >= date
        query = query.where(Reservation.reservation_time >= date)
        
    if status:
        query = query.where(Reservation.status == status)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    res_in: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # If customer_id not provided but name is, create temporary/quick customer or just note?
    # For MVP, we required customer_id or creates one?
    # Let's assume customer_id MUST be resolved by frontend first via /customers API, 
    # OR we handle quick creation here. 
    
    final_customer_id = res_in.customer_id
    
    if not final_customer_id and res_in.customer_name:
        # Quick create customer
        new_cust = Customer(
            tenant_id=current_user.tenant_id,
            name=res_in.customer_name,
            phone="0000000000" # Placeholder
        )
        db.add(new_cust)
        await db.flush() # Get ID
        final_customer_id = new_cust.id

    new_res = Reservation(
        tenant_id=current_user.tenant_id,
        customer_id=final_customer_id,
        agent_id=res_in.agent_id,
        table_id=res_in.table_id,
        reservation_time=res_in.reservation_time,
        party_size=res_in.party_size,
        notes=res_in.notes,
        tags=res_in.tags
    )
    
    db.add(new_res)
    await db.commit()
    await db.refresh(new_res)
    return new_res

@router.put("/{reservation_id}/status", response_model=ReservationResponse)
async def update_reservation_status(
    reservation_id: UUID,
    status: ReservationStatus = Body(embed=True),
    table_id: Optional[UUID] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Reservation).where(
        Reservation.id == reservation_id,
        Reservation.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    reservation.status = status
    if table_id:
        reservation.table_id = table_id
        
        # If seated, update table status too?
        if status == ReservationStatus.SEATED:
            q_table = select(Table).where(Table.id == table_id)
            table_res = await db.execute(q_table)
            table = table_res.scalar_one_or_none()
            if table:
                table.status = "occupied"
                
    await db.commit()
    await db.refresh(reservation)
    return reservation

# Helper to list Agents
@router.get("/agents", response_model=List[dict])
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CommissionAgent).where(CommissionAgent.tenant_id == current_user.tenant_id)
    result = await db.execute(query)
    agents = result.scalars().all()
    return [{"id": a.id, "name": a.name, "type": a.type} for a in agents]
