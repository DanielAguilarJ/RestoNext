"""
RestoNext MX - Tables API Routes
Table management and transfer operations
"""

from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_waiter
from app.models.models import User, Table, Order, OrderStatus, TableStatus
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/pos/tables", tags=["POS - Tables"])


# ============================================
# Schemas
# ============================================

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


# ============================================
# Table Transfer Endpoint
# ============================================

@router.post("/transfer", response_model=TableTransferResponse)
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


@router.get("/free")
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
