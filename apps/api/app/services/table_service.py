"""
RestoNext MX - Table Lifecycle Service
Manages table tokens, session lifecycle, and security

SECURITY CONSIDERATIONS:
1. Token rotation invalidates previous QR codes immediately
2. Session close auto-rotates token (prevents link reuse)
3. All operations require tenant context
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Table, TableStatus, Order, OrderStatus, ServiceRequest, ServiceRequestStatus
)
from app.core.websocket_manager import ws_manager


class TableService:
    """
    Service for managing table lifecycle operations.
    
    Key Operations:
    - Token rotation (security)
    - Session close (complete table turnover)
    - Status management
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def rotate_table_token(
        self, 
        table_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Table:
        """
        Generate a new UUID token for the table.
        This invalidates any existing QR codes scanning the old token.
        
        Security: Old links immediately return 401 Unauthorized.
        
        Args:
            table_id: Target table UUID
            tenant_id: Optional tenant ID for additional security validation
            
        Returns:
            Updated Table with new token
            
        Raises:
            ValueError: If table not found or tenant mismatch
        """
        # Build query with optional tenant filter
        query = select(Table).where(Table.id == table_id)
        if tenant_id:
            query = query.where(Table.tenant_id == tenant_id)
        
        result = await self.db.execute(query)
        table = result.scalar_one_or_none()
        
        if not table:
            raise ValueError(f"Table {table_id} not found")
        
        # Generate new token
        old_token = table.qr_secret_token
        new_token = uuid.uuid4()
        
        table.qr_secret_token = new_token
        table.qr_token_generated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(table)
        
        # Notify WebSocket clients that token was rotated
        # This allows any connected tablets to show "session expired" message
        await ws_manager.broadcast_to_channel({
            "event": "table:token_rotated",
            "payload": {
                "table_id": str(table_id),
                "table_number": table.number,
                "old_token_prefix": str(old_token)[:8],  # Only first 8 chars for logging
                "rotated_at": datetime.utcnow().isoformat()
            }
        }, "waiter")
        
        return table
    
    async def close_table_session(
        self,
        table_id: uuid.UUID,
        tenant_id: uuid.UUID,
        close_orders: bool = True,
        notify_sockets: bool = True
    ) -> Dict[str, Any]:
        """
        Complete table session closure workflow.
        
        Called when waiter closes the check. Performs:
        1. Changes table status to 'free'
        2. Rotates QR token (security)
        3. Optionally marks orders as paid
        4. Resolves any pending service requests
        5. Notifies connected sockets
        
        Args:
            table_id: Target table UUID
            tenant_id: Tenant UUID (required for security)
            close_orders: Whether to mark open orders as paid
            notify_sockets: Whether to broadcast WebSocket notifications
            
        Returns:
            Dict with summary of operations performed
        """
        result_summary = {
            "table_id": str(table_id),
            "timestamp": datetime.utcnow().isoformat(),
            "operations": []
        }
        
        # Fetch table with validation
        table_result = await self.db.execute(
            select(Table).where(
                and_(
                    Table.id == table_id,
                    Table.tenant_id == tenant_id
                )
            )
        )
        table = table_result.scalar_one_or_none()
        
        if not table:
            raise ValueError(f"Table {table_id} not found for tenant {tenant_id}")
        
        # 1. Close any open orders for this table
        if close_orders:
            orders_result = await self.db.execute(
                select(Order).where(
                    and_(
                        Order.table_id == table_id,
                        Order.status.in_([
                            OrderStatus.OPEN, 
                            OrderStatus.IN_PROGRESS, 
                            OrderStatus.READY,
                            OrderStatus.DELIVERED
                        ])
                    )
                )
            )
            orders = orders_result.scalars().all()
            
            for order in orders:
                order.status = OrderStatus.PAID
                order.updated_at = datetime.utcnow()
            
            result_summary["operations"].append({
                "action": "orders_closed",
                "count": len(orders),
                "order_ids": [str(o.id) for o in orders]
            })
        
        # 2. Resolve pending service requests
        requests_result = await self.db.execute(
            select(ServiceRequest).where(
                and_(
                    ServiceRequest.table_id == table_id,
                    ServiceRequest.status != ServiceRequestStatus.RESOLVED
                )
            )
        )
        requests = requests_result.scalars().all()
        
        for req in requests:
            req.status = ServiceRequestStatus.RESOLVED
        
        result_summary["operations"].append({
            "action": "service_requests_resolved",
            "count": len(requests)
        })
        
        # 3. Change table status to free
        old_status = table.status
        table.status = TableStatus.FREE
        
        result_summary["operations"].append({
            "action": "status_changed",
            "from": old_status.value,
            "to": TableStatus.FREE.value
        })
        
        # 4. Rotate token (security - invalidates old QR)
        old_token = table.qr_secret_token
        table.qr_secret_token = uuid.uuid4()
        table.qr_token_generated_at = datetime.utcnow()
        
        result_summary["operations"].append({
            "action": "token_rotated",
            "new_token_prefix": str(table.qr_secret_token)[:8]
        })
        
        await self.db.commit()
        
        # 5. WebSocket notifications
        if notify_sockets:
            # Notify POS/Waiter that table is now free
            await ws_manager.broadcast_to_channel({
                "event": "table:session_closed",
                "payload": {
                    "table_id": str(table_id),
                    "table_number": table.number,
                    "status": "free",
                    "closed_at": datetime.utcnow().isoformat()
                }
            }, "waiter")
            
            # Special broadcast for any tablet connected to this table
            # This triggers the "session expired" screen
            await ws_manager.broadcast_to_channel({
                "event": "table:cleared",
                "payload": {
                    "table_id": str(table_id),
                    "message": "Tu sesión ha terminado. ¡Gracias por tu visita!"
                }
            }, f"table:{table_id}")
        
        return result_summary
    
    async def get_all_tables_with_qr_info(
        self,
        tenant_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        Get all tables with QR code generation info for admin panel.
        
        Returns list of tables with:
        - Basic info (id, number, capacity, status)
        - QR token info (token, generated_at)
        - Self-service status
        """
        result = await self.db.execute(
            select(Table)
            .where(Table.tenant_id == tenant_id)
            .order_by(Table.number)
        )
        tables = result.scalars().all()
        
        return [
            {
                "id": str(t.id),
                "number": t.number,
                "capacity": t.capacity,
                "status": t.status.value,
                "qr_secret_token": str(t.qr_secret_token),
                "qr_token_generated_at": t.qr_token_generated_at.isoformat() if t.qr_token_generated_at else None,
                "self_service_enabled": t.self_service_enabled
            }
            for t in tables
        ]
    
    async def toggle_self_service(
        self,
        table_id: uuid.UUID,
        tenant_id: uuid.UUID,
        enabled: bool
    ) -> Table:
        """
        Enable or disable self-service ordering for a specific table.
        
        Args:
            table_id: Target table UUID
            tenant_id: Tenant UUID for validation
            enabled: Whether self-service should be enabled
            
        Returns:
            Updated Table
        """
        result = await self.db.execute(
            select(Table).where(
                and_(
                    Table.id == table_id,
                    Table.tenant_id == tenant_id
                )
            )
        )
        table = result.scalar_one_or_none()
        
        if not table:
            raise ValueError(f"Table {table_id} not found")
        
        table.self_service_enabled = enabled
        await self.db.commit()
        await self.db.refresh(table)
        
        return table


def get_table_service(db: AsyncSession) -> TableService:
    """Factory function for dependency injection"""
    return TableService(db)
