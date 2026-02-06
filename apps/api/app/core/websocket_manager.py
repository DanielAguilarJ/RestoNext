"""
RestoNext MX - WebSocket Connection Manager
Redis-backed pub/sub for real-time kitchen updates
"""

import json
import asyncio
from typing import Dict, Set, Optional
from datetime import datetime

from fastapi import WebSocket
import redis.asyncio as redis

from app.core.config import get_settings

settings = get_settings()


class ConnectionManager:
    """
    Manages WebSocket connections with Redis pub/sub.
    
    Architecture:
    - Each connected client is tracked by role (kitchen, bar, waiter)
    - Redis pub/sub allows scaling across multiple API instances
    - Messages are broadcasted to specific channels based on destination
    """
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "kitchen": set(),
            "bar": set(),
            "waiter": set(),
            "cashier": set(),  # For bill/payment notifications
            "pos": set(),      # For POS stations
            "all": set(),
        }
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
    
    async def connect_redis(self):
        """
        Initialize Redis connection for pub/sub.
        CRITICAL: This must NEVER block startup, even if Redis is unavailable.
        """
        import asyncio
        import os
        
        if self.redis_client is not None:
            return  # Already connected
        
        # Try multiple Redis URL sources (DigitalOcean uses REDISS_URL for TLS)
        redis_url = (
            os.getenv("REDIS_URL") or 
            os.getenv("REDISS_URL") or 
            settings.redis_url or 
            ""
        )
        
        # Skip if it's clearly a local default and we're in production
        is_local_default = redis_url in ("", "redis://localhost:6379") or (
            "localhost" in redis_url and not settings.debug
        )
        if is_local_default:
            print(f"INFO:     Redis skipped (URL={redis_url[:30]}... in production mode)")
            return
        
        async def _try_connect():
            """Inner function to attempt Redis connection"""
            client = redis.from_url(
                redis_url,
                socket_connect_timeout=3,
                socket_timeout=3,
                retry_on_timeout=False,
            )
            await client.ping()  # Test connection
            return client
        
        try:
            # Wrap entire connection attempt in a 5-second timeout
            print(f"INFO:     Attempting Redis connection to {redis_url}...")
            self.redis_client = await asyncio.wait_for(_try_connect(), timeout=5.0)
            
            # Only set up pub/sub if connection succeeded
            self.pubsub = self.redis_client.pubsub()
            await asyncio.wait_for(
                self.pubsub.subscribe("kitchen:new_order", "kitchen:order_update", "table:call_waiter"),
                timeout=3.0
            )
            print(f"INFO:     ✅ Connected to Redis successfully")
            
        except asyncio.TimeoutError:
            print("WARNING:  ⚠️ Redis connection timed out. Continuing without Redis.")
            self._cleanup_redis()
        except asyncio.CancelledError:
            print("WARNING:  ⚠️ Redis connection cancelled. Continuing without Redis.")
            self._cleanup_redis()
        except Exception as e:
            print(f"WARNING:  ⚠️ Redis connection failed: {type(e).__name__}: {e}")
            self._cleanup_redis()
    
    def _cleanup_redis(self):
        """Clean up Redis resources on failure"""
        self.redis_client = None
        self.pubsub = None
    
    async def disconnect_redis(self):
        """Close Redis connection"""
        if self.pubsub:
            await self.pubsub.unsubscribe()
        if self.redis_client:
            await self.redis_client.close()
    
    async def connect(self, websocket: WebSocket, channel: str = "all"):
        """Add a new WebSocket connection to a channel"""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        self.active_connections["all"].add(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str = "all"):
        """Remove a WebSocket connection"""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
        self.active_connections["all"].discard(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to a specific client"""
        await websocket.send_json(message)
    
    async def broadcast_to_channel(self, message: dict, channel: str):
        """
        Broadcast message to all connections in a channel.
        Also publishes to Redis for multi-instance support.
        """
        # Add timestamp to message
        message["timestamp"] = datetime.utcnow().isoformat()
        
        # Publish to Redis for other API instances
        if self.redis_client:
            await self.redis_client.publish(channel, json.dumps(message))
        
        # Send to local connections
        if channel in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.add(connection)
            
            # Clean up dead connections
            for dead in dead_connections:
                self.disconnect(dead, channel)
    
    async def notify_kitchen_new_order(self, order_data: dict):
        """Send new order notification to kitchen displays"""
        kitchen_count = len(self.active_connections.get("kitchen", set()))
        print(f"INFO:     🔔 Broadcasting kitchen:new_order to {kitchen_count} kitchen connection(s)")
        message = {
            "event": "kitchen:new_order",
            "payload": order_data
        }
        await self.broadcast_to_channel(message, "kitchen")
    
    async def notify_kitchen_item_ready(self, item_data: dict):
        """Notify that an item is ready for pickup"""
        message = {
            "event": "kitchen:item_ready",
            "payload": item_data
        }
        await self.broadcast_to_channel(message, "waiter")
    
    async def notify_call_waiter(self, table_number: int, tenant_id: str):
        """Customer called waiter via QR menu"""
        message = {
            "event": "table:call_waiter",
            "payload": {
                "table_number": table_number,
                "tenant_id": tenant_id
            }
        }
        await self.broadcast_to_channel(message, "waiter")
    
    async def notify_bar_new_order(self, order_data: dict):
        """Send bar items to bar display"""
        message = {
            "event": "bar:new_order",
            "payload": order_data
        }
        await self.broadcast_to_channel(message, "bar")
    
    async def notify_service_request(self, request_data: dict):
        """
        Notify POS/Waiter stations of new service request.
        Used for self-service dining module.
        """
        message = {
            "event": "service_request:new",
            "payload": request_data
        }
        await self.broadcast_to_channel(message, "waiter")
        # Also broadcast to POS/cashier for visibility
        await self.broadcast_to_channel(message, "pos")
    
    async def notify_service_request_resolved(self, request_data: dict):
        """Notify that a service request has been resolved"""
        message = {
            "event": "service_request:resolved",
            "payload": request_data
        }
        await self.broadcast_to_channel(message, "waiter")
    
    async def notify_table_order_update(self, table_id: str, order_data: dict):
        """
        Notify about order updates for a specific table.
        Used to update POS view when self-service order is placed.
        """
        message = {
            "event": "table:order_update",
            "payload": {
                "table_id": table_id,
                **order_data
            }
        }
        await self.broadcast_to_channel(message, "waiter")
        await self.broadcast_to_channel(message, "pos")
    
    async def notify_bill_requested(
        self, 
        table_id: str,
        table_number: int,
        tenant_id: str,
        total: float,
        subtotal: float,
        tax: float,
        items_count: int,
        currency: str = "MXN"
    ):
        """
        High-priority notification when customer requests the bill.
        
        Broadcasts to:
        - waiter: Primary notification for service
        - cashier: Prepare for payment
        - pos: Dashboard visibility
        
        This is a critical path for customer experience - instant delivery required.
        """
        message = {
            "event": "table:bill_requested",
            "priority": "high",
            "payload": {
                "table_id": table_id,
                "table_number": table_number,
                "tenant_id": tenant_id,
                "total": total,
                "subtotal": subtotal,
                "tax": tax,
                "items_count": items_count,
                "currency": currency,
                "message": f"Mesa {table_number} pide la cuenta ({currency} ${total:,.2f})",
                "action_url": f"/cashier?table={table_id}"
            }
        }
        
        # Broadcast to all relevant channels
        await self.broadcast_to_channel(message, "waiter")
        await self.broadcast_to_channel(message, "cashier")
        await self.broadcast_to_channel(message, "pos")
    
    async def listen_redis(self):
        """
        Background task to listen for Redis pub/sub messages.
        Forwards messages from other API instances to local WebSocket connections.
        """
        if not self.pubsub:
            return
        
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"].decode()
                data = json.loads(message["data"])
                
                # Forward to local connections
                if channel in self.active_connections:
                    for connection in self.active_connections[channel].copy():
                        try:
                            await connection.send_json(data)
                        except Exception:
                            self.disconnect(connection, channel)


# Global instance
ws_manager = ConnectionManager()
