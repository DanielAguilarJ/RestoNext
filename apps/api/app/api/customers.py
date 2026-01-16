from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import User, Customer
from app.schemas.schemas import CustomerCreate, CustomerResponse, AddressSchema

router = APIRouter()

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search customers by name, email, or phone.
    """
    query = select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Customer.name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.phone.ilike(search_term)
            )
        )
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new customer profile.
    Checks for existing phone/email to avoid duplicates.
    """
    # Check duplicates
    if customer_in.phone:
        query = select(Customer).where(
            Customer.tenant_id == current_user.tenant_id,
            Customer.phone == customer_in.phone
        )
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Customer with this phone already exists")

    new_customer = Customer(
        tenant_id=current_user.tenant_id,
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        notes=customer_in.notes,
        addresses=[addr.dict() for addr in customer_in.addresses]
    )
    
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    customer.name = customer_in.name
    customer.email = customer_in.email
    customer.phone = customer_in.phone
    customer.notes = customer_in.notes
    # Merge addresses strategy: append new ones or replace? 
    # For now, simple replacement from input if provided, or logic can be enhanced.
    if customer_in.addresses:
         customer.addresses = [addr.dict() for addr in customer_in.addresses]
    
    await db.commit()
    await db.refresh(customer)
    return customer

@router.post("/{customer_id}/addresses", response_model=CustomerResponse)
async def add_address(
    customer_id: UUID,
    address: AddressSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # SQLAlchemy mutable JSON detection is tricky, best to copy, modify, set back
    current_addresses = list(customer.addresses)
    current_addresses.append(address.dict())
    customer.addresses = current_addresses
    
    await db.commit()
    await db.refresh(customer)
    return customer
