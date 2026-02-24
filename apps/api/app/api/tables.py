"""
RestoNext MX - Tables API Routes
Table management and transfer operations

This module provides two sets of endpoints:
1. /tables - Basic table listing and status updates for POS
2. /pos/tables - Advanced operations like table transfers
"""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_waiter
from app.models.models import User, Table, Order, OrderStatus, TableStatus
from app.core.websocket_manager import ws_manager


# ============================================
# Schemas
# ============================================

class TableResponse(BaseModel):
    """Table response model"""
    id: str
    number: int
    capacity: int
    status: str
    pos_x: int = 0
    pos_y: int = 0
    self_service_enabled: bool = True

    class Config:
        from_attributes = True


class TableStatusUpdate(BaseModel):
    """Request to update table status"""
    status: str = Field(..., description="New status: free, occupied, or bill_requested")


class TableTransferRequest(BaseModel):
    """Request to transfer orders from one table to another"""
    source_table_id: UUID
    destination_table_id: UUID
    transfer_all_orders: bool = True
    order_ids: Optional[list[UUID]] = None  # If not transferring all


class TableTransferResponse(BaseModel):
    """Response for table transfer operation"""
    success: bool
    message: str
    transferred_orders: int
    source_table_number: int
    destination_table_number: int


# Create main router for /tables endpoints
router = APIRouter(tags=["POS - Tables"])


# ============================================
# Basic Table Endpoints (/tables)
# ============================================

@router.get("/tables", response_model=List[TableResponse])
async def list_tables(
    restaurant_id: Optional[str] = Query(None, description="Filter by restaurant/tenant ID (ignored, uses auth)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all tables for the current tenant.
    Used by the POS to display the table map.
    """
    result = await db.execute(
        select(Table)
        .where(Table.tenant_id == current_user.tenant_id)
        .order_by(Table.number)
    )
    tables = result.scalars().all()
    
    return [
        TableResponse(
            id=str(t.id),
            number=t.number,
            capacity=t.capacity,
            status=t.status.value if t.status else "free",
            pos_x=t.pos_x or 0,
            pos_y=t.pos_y or 0,
            self_service_enabled=t.self_service_enabled if hasattr(t, 'self_service_enabled') else True,
        )
        for t in tables
    ]


@router.patch("/tables/{table_id}/status", response_model=TableResponse)
async def update_table_status(
    table_id: str,
    update: TableStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a table's status (free, occupied, bill_requested).
    Used by the POS when manually changing table state.
    """
    try:
        table_uuid = UUID(table_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid table_id format"
        )
    
    result = await db.execute(
        select(Table).where(
            and_(
                Table.id == table_uuid,
                Table.tenant_id == current_user.tenant_id
            )
        )
    )
    table = result.scalar_one_or_none()
    
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Validate status
    try:
        new_status = TableStatus(update.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in TableStatus]}"
        )
    
    table.status = new_status
    await db.commit()
    await db.refresh(table)
    
    # Notify via WebSocket (don't fail the request if WS fails)
    try:
        message = {
            "event": "table:status_changed",
            "payload": {
                "table_id": str(table.id),
                "table_number": table.number,
                "new_status": table.status.value,
            }
        }
        await ws_manager.broadcast_to_channel(message, "pos")
        await ws_manager.broadcast_to_channel(message, "waiter")
    except Exception:
        pass
    
    return TableResponse(
        id=str(table.id),
        number=table.number,
        capacity=table.capacity,
        status=table.status.value,
        pos_x=table.pos_x or 0,
        pos_y=table.pos_y or 0,
        self_service_enabled=table.self_service_enabled if hasattr(table, 'self_service_enabled') else True,
    )


# ============================================
# Table Transfer Endpoints (/pos/tables)
# ============================================

@router.post("/pos/tables/transfer", response_model=TableTransferResponse)
async def transfer_table(
    transfer: TableTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_waiter),
):
    """
    Transfer orders from one table to another.
    
    Use cases:
    - Customer wants to move to a different table
    - Combine tables for a larger party
    - Staff error correction
    
    Rules:
    - Source table must have open orders
    - Destination table must be free or occupied by same party
    - All open orders are transferred (or specified subset)
    - Source table becomes free after transfer
    - Destination table becomes occupied
    """
    # Get source table
    source_result = await db.execute(
        select(Table).where(
            and_(
                Table.id == transfer.source_table_id,
                Table.tenant_id == current_user.tenant_id
            )
        )
    )
    source_table = source_result.scalar_one_or_none()
    
    if not source_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source table not found"
        )
    
    # Get destination table
    dest_result = await db.execute(
        select(Table).where(
            and_(
                Table.id == transfer.destination_table_id,
                Table.tenant_id == current_user.tenant_id
            )
        )
    )
    dest_table = dest_result.scalar_one_or_none()
    
    if not dest_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination table not found"
        )
    
    # Cannot transfer to same table
    if source_table.id == dest_table.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same table"
        )
    
    # Destination must be free
    if dest_table.status != TableStatus.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Destination table {dest_table.number} is not available (status: {dest_table.status.value})"
        )
    
    # Get orders to transfer
    if transfer.transfer_all_orders:
        orders_query = select(Order).where(
            and_(
                Order.table_id == source_table.id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY])
            )
        )
    else:
        if not transfer.order_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="order_ids required when not transferring all orders"
            )
        orders_query = select(Order).where(
            and_(
                Order.id.in_(transfer.order_ids),
                Order.table_id == source_table.id
            )
        )
    
    orders_result = await db.execute(orders_query)
    orders = orders_result.scalars().all()
    
    if len(orders) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No open orders to transfer from source table"
        )
    
    # Perform the transfer
    transferred_count = 0
    for order in orders:
        order.table_id = dest_table.id
        transferred_count += 1
    
    # Update table statuses
    source_table.status = TableStatus.FREE
    dest_table.status = TableStatus.OCCUPIED
    
    await db.commit()
    
    # Notify via WebSocket
    await ws_manager.broadcast_to_tenant(
        current_user.tenant_id,
        {
            "event": "table:transfer",
            "data": {
                "source_table_id": str(source_table.id),
                "source_table_number": source_table.number,
                "destination_table_id": str(dest_table.id),
                "destination_table_number": dest_table.number,
                "transferred_orders": transferred_count,
            }
        }
    )
    
    return TableTransferResponse(
        success=True,
        message=f"Transferred {transferred_count} order(s) from Mesa {source_table.number} to Mesa {dest_table.number}",
        transferred_orders=transferred_count,
        source_table_number=source_table.number,
        destination_table_number=dest_table.number,
    )


@router.get("/pos/tables/free")
async def get_free_tables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all free tables for the current tenant.
    Used for table transfer destination selection.
    """
    result = await db.execute(
        select(Table).where(
            and_(
                Table.tenant_id == current_user.tenant_id,
                Table.status == TableStatus.FREE
            )
        ).order_by(Table.number)
    )
    tables = result.scalars().all()
    
    return {
        "tables": [
            {
                "id": str(t.id),
                "number": t.number,
                "capacity": t.capacity,
                "pos_x": t.pos_x,
                "pos_y": t.pos_y,
            }
            for t in tables
        ]
    }
