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
    user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    List all tables with QR code generation info.
    Used by the admin QR code management page.
    """
    service = get_table_service(db)
    tables = await service.get_all_tables_with_qr_info(user.tenant_id)
    
    # Build base URL for QR codes
    # In production, this should come from environment/config
    base_url = "https://app.restonext.com/dine"
    
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
    
    base_url = "https://app.restonext.com/dine"
    
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
