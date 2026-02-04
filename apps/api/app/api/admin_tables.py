"""
RestoNext MX - Admin Tables API Router
Backend endpoints for table management (QR codes, token rotation, etc.)

SECURITY: These endpoints require admin/manager authentication
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, UserRole
from app.services.table_service import TableService, get_table_service



router = APIRouter(prefix="/admin/tables", tags=["Admin - Tables"])


# ============================================
# Schemas
# ============================================

class TableQRInfo(BaseModel):
    """Table info for QR code management"""
    id: str
    number: int
    capacity: int
    status: str
    qr_secret_token: str
    qr_token_generated_at: Optional[str]
    self_service_enabled: bool
    qr_url: str  # Full URL for QR code


class TableListResponse(BaseModel):
    """Response for table list endpoint"""
    tables: List[TableQRInfo]
    base_url: str


class RotateTokenResponse(BaseModel):
    """Response for token rotation"""
    table_id: str
    table_number: int
    new_token: str
    rotated_at: str
    new_qr_url: str


class CloseSessionResponse(BaseModel):
    """Response for session close"""
    table_id: str
    table_number: int
    operations: List[dict]
    closed_at: str


class ToggleSelfServiceRequest(BaseModel):
    """Request to toggle self-service"""
    enabled: bool


class CreateTableRequest(BaseModel):
    """Request to create a new table"""
    number: Optional[int] = None  # Auto-assign if not provided
    capacity: int = 4
    pos_x: int = 0
    pos_y: int = 0
    self_service_enabled: bool = True


class UpdateTableRequest(BaseModel):
    """Request to update a table"""
    number: Optional[int] = None
    capacity: Optional[int] = None
    pos_x: Optional[int] = None
    pos_y: Optional[int] = None
    self_service_enabled: Optional[bool] = None


class TableResponse(BaseModel):
    """Response for table operations"""
    id: str
    number: int
    capacity: int
    status: str
    pos_x: int
    pos_y: int
    self_service_enabled: bool


class SetTableCountRequest(BaseModel):
    """Request to set total table count"""
    target_count: int  # 1-100


# ============================================
# Dependencies
# ============================================

async def require_manager(user: User = Depends(get_current_user)) -> User:
    """Dependency to require manager or admin role"""
    if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can perform this action"
        )
    return user


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=TableListResponse)
async def list_tables_with_qr(
    user: User = Depends(get_current_user),  # Allow any authenticated user to view QR codes
    db: AsyncSession = Depends(get_db)
):
    """
    List all tables with QR code generation info.
    Used by the admin QR code management page.
    """
    service = get_table_service(db)
    tables = await service.get_all_tables_with_qr_info(user.tenant_id)
    
    # Build base URL for QR codes
    from app.core.config import get_settings
    settings = get_settings()
    base_url = f"{settings.frontend_url}/dine"
    
    return TableListResponse(
        tables=[
            TableQRInfo(
                **t,
                qr_url=f"{base_url}/{user.tenant_id}/{t['id']}?token={t['qr_secret_token']}"
            )
            for t in tables
        ],
        base_url=base_url
    )


@router.post("/{table_id}/rotate-token", response_model=RotateTokenResponse)
async def rotate_table_token(
    table_id: str,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Rotate the QR token for a specific table.
    This invalidates any existing QR codes.
    
    Security: Old tokens immediately become invalid.
    """
    try:
        table_uuid = uuid.UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table ID format"
        )
    
    service = get_table_service(db)
    
    try:
        table = await service.rotate_table_token(table_uuid, user.tenant_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    from app.core.config import get_settings
    settings = get_settings()
    base_url = f"{settings.frontend_url}/dine"
    
    return RotateTokenResponse(
        table_id=str(table.id),
        table_number=table.number,
        new_token=str(table.qr_secret_token),
        rotated_at=datetime.utcnow().isoformat(),
        new_qr_url=f"{base_url}/{user.tenant_id}/{table.id}?token={table.qr_secret_token}"
    )


@router.post("/{table_id}/close-session", response_model=CloseSessionResponse)
async def close_table_session(
    table_id: str,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Close the table session completely.
    
    This will:
    1. Mark table as 'free'
    2. Close any open orders as 'paid'
    3. Resolve pending service requests
    4. Rotate the QR token (security)
    5. Disconnect any active tablet sessions
    """
    try:
        table_uuid = uuid.UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table ID format"
        )
    
    service = get_table_service(db)
    
    try:
        result = await service.close_table_session(table_uuid, user.tenant_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    # Get table number for response
    from sqlalchemy import select
    from app.models.models import Table
    
    table_result = await db.execute(
        select(Table).where(Table.id == table_uuid)
    )
    table = table_result.scalar_one_or_none()
    
    return CloseSessionResponse(
        table_id=str(table_uuid),
        table_number=table.number if table else 0,
        operations=result.get("operations", []),
        closed_at=result.get("timestamp", datetime.utcnow().isoformat())
    )


@router.patch("/{table_id}/self-service")
async def toggle_self_service(
    table_id: str,
    request: ToggleSelfServiceRequest,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Enable or disable self-service ordering for a specific table.
    """
    try:
        table_uuid = uuid.UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table ID format"
        )
    
    service = get_table_service(db)
    
    try:
        table = await service.toggle_self_service(
            table_uuid, 
            user.tenant_id, 
            request.enabled
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    return {
        "table_id": str(table.id),
        "table_number": table.number,
        "self_service_enabled": table.self_service_enabled,
        "updated_at": datetime.utcnow().isoformat()
    }


@router.post("/bulk-rotate-tokens")
async def bulk_rotate_all_tokens(
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Rotate tokens for ALL tables.
    Useful for security rotations or when printing new QR codes.
    """
    from sqlalchemy import select
    from app.models.models import Table
    
    # Get all tables for this tenant
    result = await db.execute(
        select(Table).where(Table.tenant_id == user.tenant_id)
    )
    tables = result.scalars().all()
    
    service = get_table_service(db)
    rotated = []
    
    for table in tables:
        await service.rotate_table_token(table.id, user.tenant_id)
        rotated.append({
            "table_id": str(table.id),
            "table_number": table.number
        })
    
    return {
        "message": f"Rotated tokens for {len(rotated)} tables",
        "tables": rotated,
        "rotated_at": datetime.utcnow().isoformat()
    }


# ============================================
# Table CRUD Endpoints
# ============================================

@router.post("", response_model=TableResponse)
async def create_table(
    request: CreateTableRequest,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new table.
    If number is not provided, auto-assigns the next available number.
    """
    from sqlalchemy import select, func
    from app.models.models import Table, TableStatus
    
    # Get max table number if not provided
    if request.number is None:
        result = await db.execute(
            select(func.max(Table.number)).where(Table.tenant_id == user.tenant_id)
        )
        max_number = result.scalar() or 0
        table_number = max_number + 1
    else:
        # Check for duplicate number
        result = await db.execute(
            select(Table).where(
                Table.tenant_id == user.tenant_id,
                Table.number == request.number
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table number {request.number} already exists"
            )
        table_number = request.number
    
    # Create the table
    table = Table(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        number=table_number,
        capacity=request.capacity,
        status=TableStatus.FREE,
        pos_x=request.pos_x,
        pos_y=request.pos_y,
        self_service_enabled=request.self_service_enabled
    )
    db.add(table)
    await db.commit()
    await db.refresh(table)
    
    return TableResponse(
        id=str(table.id),
        number=table.number,
        capacity=table.capacity,
        status=table.status.value,
        pos_x=table.pos_x or 0,
        pos_y=table.pos_y or 0,
        self_service_enabled=table.self_service_enabled
    )


@router.put("/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: str,
    request: UpdateTableRequest,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing table.
    Only updates fields that are provided.
    """
    from sqlalchemy import select
    from app.models.models import Table
    
    try:
        table_uuid = uuid.UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table ID format"
        )
    
    result = await db.execute(
        select(Table).where(
            Table.id == table_uuid,
            Table.tenant_id == user.tenant_id
        )
    )
    table = result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Check for duplicate number if changing it
    if request.number is not None and request.number != table.number:
        dup_result = await db.execute(
            select(Table).where(
                Table.tenant_id == user.tenant_id,
                Table.number == request.number
            )
        )
        if dup_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table number {request.number} already exists"
            )
        table.number = request.number
    
    if request.capacity is not None:
        table.capacity = request.capacity
    if request.pos_x is not None:
        table.pos_x = request.pos_x
    if request.pos_y is not None:
        table.pos_y = request.pos_y
    if request.self_service_enabled is not None:
        table.self_service_enabled = request.self_service_enabled
    
    await db.commit()
    await db.refresh(table)
    
    return TableResponse(
        id=str(table.id),
        number=table.number,
        capacity=table.capacity,
        status=table.status.value,
        pos_x=table.pos_x or 0,
        pos_y=table.pos_y or 0,
        self_service_enabled=table.self_service_enabled
    )


@router.delete("/{table_id}")
async def delete_table(
    table_id: str,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a table.
    Only free tables with no open orders can be deleted.
    """
    from sqlalchemy import select
    from app.models.models import Table, TableStatus, Order, OrderStatus
    
    try:
        table_uuid = uuid.UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table ID format"
        )
    
    result = await db.execute(
        select(Table).where(
            Table.id == table_uuid,
            Table.tenant_id == user.tenant_id
        )
    )
    table = result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Check if table is free
    if table.status != TableStatus.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete an occupied table. Close the session first."
        )
    
    # Check for open orders
    orders_result = await db.execute(
        select(Order).where(
            Order.table_id == table_uuid,
            Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY])
        )
    )
    if orders_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete table with open orders"
        )
    
    table_number = table.number
    await db.delete(table)
    await db.commit()
    
    return {
        "message": f"Table {table_number} deleted successfully",
        "table_id": table_id
    }


@router.post("/set-count")
async def set_table_count(
    request: SetTableCountRequest,
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    Set the total number of tables.
    
    - If target_count > current, creates new tables
    - If target_count < current, removes the highest-numbered free tables
    
    Tables with open orders or that are occupied cannot be removed.
    """
    from sqlalchemy import select, func
    from app.models.models import Table, TableStatus, Order, OrderStatus
    
    # Validate range
    target = max(1, min(100, request.target_count))
    
    # Get current table count
    result = await db.execute(
        select(func.count(Table.id)).where(Table.tenant_id == user.tenant_id)
    )
    current_count = result.scalar() or 0
    
    tables_created = 0
    tables_deleted = 0
    errors = []
    
    if target > current_count:
        # Add tables
        result = await db.execute(
            select(func.max(Table.number)).where(Table.tenant_id == user.tenant_id)
        )
        max_number = result.scalar() or 0
        
        for i in range(target - current_count):
            new_number = max_number + i + 1
            cols = 5
            row = (new_number - 1) // cols
            col = (new_number - 1) % cols
            
            table = Table(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                number=new_number,
                capacity=4,
                status=TableStatus.FREE,
                pos_x=col * 2 + 1,
                pos_y=row * 2 + 1,
                self_service_enabled=True
            )
            db.add(table)
            tables_created += 1
        
        await db.commit()
    
    elif target < current_count:
        # Remove tables (highest numbers first, only free ones)
        to_remove = current_count - target
        
        result = await db.execute(
            select(Table).where(
                Table.tenant_id == user.tenant_id
            ).order_by(Table.number.desc())
        )
        all_tables = result.scalars().all()
        
        for table in all_tables:
            if tables_deleted >= to_remove:
                break
            
            if table.status != TableStatus.FREE:
                errors.append(f"Mesa {table.number} está ocupada, no se puede eliminar")
                continue
            
            # Check for open orders
            orders_result = await db.execute(
                select(Order).where(
                    Order.table_id == table.id,
                    Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY])
                )
            )
            if orders_result.scalar_one_or_none():
                errors.append(f"Mesa {table.number} tiene órdenes abiertas")
                continue
            
            await db.delete(table)
            tables_deleted += 1
        
        await db.commit()
    
    # Get final count
    final_result = await db.execute(
        select(func.count(Table.id)).where(Table.tenant_id == user.tenant_id)
    )
    final_count = final_result.scalar() or 0
    
    return {
        "previous_count": current_count,
        "requested_count": target,
        "final_count": final_count,
        "tables_created": tables_created,
        "tables_deleted": tables_deleted,
        "errors": errors if errors else None
    }

