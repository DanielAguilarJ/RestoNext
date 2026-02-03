from typing import List, Optional, Union
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Reservation, ReservationStatus, Table, TableStatus, Customer, CommissionAgent
from app.schemas.schemas import ReservationCreate, ReservationResponse, TableResponse
from app.services.reservation_service import ReservationService

router = APIRouter(tags=["Reservations"])

def get_reservation_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ReservationService:
    return ReservationService(db, current_user.tenant_id)


def reservation_to_response(reservation: Reservation) -> dict:
    """Convert Reservation model to response dict with customer_name."""
    return {
        "id": reservation.id,
        "customer_id": reservation.customer_id,
        "customer_name": reservation.customer.name if reservation.customer else None,
        "agent_id": reservation.agent_id,
        "table_id": reservation.table_id,
        "reservation_time": reservation.reservation_time,
        "party_size": reservation.party_size,
        "status": reservation.status.value if hasattr(reservation.status, 'value') else reservation.status,
        "deposit_amount": reservation.deposit_amount,
        "payment_status": reservation.payment_status.value if hasattr(reservation.payment_status, 'value') else reservation.payment_status,
        "additional_table_ids": reservation.additional_table_ids or [],
        "notes": reservation.notes,
        "tags": reservation.tags or [],
    }


@router.get("/", response_model=List[ReservationResponse])
async def list_reservations(
    date: Optional[datetime] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Reservation).options(
        selectinload(Reservation.customer)
    ).where(Reservation.tenant_id == current_user.tenant_id)
    
    if date:
        query = query.where(Reservation.reservation_time >= date)
        
    if status:
        query = query.where(Reservation.status == status)
        
    result = await db.execute(query)
    reservations = result.scalars().all()
    
    return [reservation_to_response(r) for r in reservations]

@router.get("/check-availability", response_model=List[List[TableResponse]])
async def check_availability(
    reservation_time: datetime,
    party_size: int = 2,
    service: ReservationService = Depends(get_reservation_service)
):
    """
    Check table availability with experimental Table Merging.
    Returns lists of table combinations (e.g. [[Table1], [Table2, Table3]]).
    """
    combinations = await service.get_available_tables_for_party(
        party_size=party_size, 
        desired_time=reservation_time
    )
    return combinations

@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    res_in: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ReservationService = Depends(get_reservation_service)
):
    """
    Create a reservation with conflict checking and deposit support.
    """
    final_customer_id = res_in.customer_id
    
    # Quick Create logic kept here as it's an orchestration concern
    if not final_customer_id and res_in.customer_name:
        new_cust = Customer(
            tenant_id=current_user.tenant_id,
            name=res_in.customer_name,
            phone="0000000000" # Placeholder
        )
        db.add(new_cust)
        await db.flush()
        final_customer_id = new_cust.id
    
    if not final_customer_id:
        raise HTTPException(status_code=400, detail="Customer ID or Name required")

    try:
        new_res = await service.create_reservation(
            customer_id=final_customer_id,
            party_size=res_in.party_size,
            reservation_time=res_in.reservation_time,
            deposit_amount=res_in.deposit_amount,
            notes=res_in.notes,
            agent_id=res_in.agent_id
        )
        # Apply tags manually if supported by service or add post-creation (Service didn't take tags yet)
        if res_in.tags:
            new_res.tags = res_in.tags
            await db.commit()
            
        return new_res
        
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

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
        if status == ReservationStatus.SEATED:
            q_table = select(Table).where(Table.id == table_id)
            table_res = await db.execute(q_table)
            table = table_res.scalar_one_or_none()
            if table:
                table.status = TableStatus.OCCUPIED
                
    await db.commit()
    await db.refresh(reservation)
    
    # Eagerly load customer for response
    if reservation.customer_id:
        customer_query = select(Customer).where(Customer.id == reservation.customer_id)
        customer_result = await db.execute(customer_query)
        reservation.customer = customer_result.scalar_one_or_none()
    
    return reservation_to_response(reservation)

@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific reservation by ID."""
    query = select(Reservation).options(
        selectinload(Reservation.customer)
    ).where(
        Reservation.id == reservation_id,
        Reservation.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    return reservation_to_response(reservation)

@router.delete("/{reservation_id}")
async def delete_reservation(
    reservation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a reservation (soft delete by cancelling, or hard delete)."""
    query = select(Reservation).where(
        Reservation.id == reservation_id,
        Reservation.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Soft delete: just mark as cancelled
    reservation.status = ReservationStatus.CANCELLED
    await db.commit()
    
    return {"message": "Reservation cancelled successfully"}

@router.get("/agents", response_model=List[dict])
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CommissionAgent).where(CommissionAgent.tenant_id == current_user.tenant_id)
    result = await db.execute(query)
    agents = result.scalars().all()
    return [{"id": a.id, "name": a.name, "type": a.type} for a in agents]
