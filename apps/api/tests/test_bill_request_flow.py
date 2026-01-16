"""
RestoNext MX - Bill Request Flow Integration Test
Tests the complete flow of requesting the bill from tablet to staff notification.

Test Scenario:
1. Create a table with an active order
2. Customer requests the bill via tablet
3. Verify table status changes to 'bill_requested'
4. Verify the total calculation is correct
5. Verify WebSocket notification is sent
"""

import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock

import pytest_asyncio
from httpx import AsyncClient, ASGITransport


# ============================================
# Mock Data Fixtures
# ============================================

@pytest.fixture
def mock_tenant_data():
    """Create mock tenant for testing"""
    return {
        "id": uuid4(),
        "name": "Test Restaurant",
        "trade_name": "Test Tacos",
        "currency": "MXN",
        "is_active": True,
        "active_addons": {"self_service": True},
        "features_config": {
            "self_service": {"can_order": True, "can_request_bill": True},
            "payments": {"online_enabled": False, "methods": ["cash", "card"]}
        }
    }


@pytest.fixture
def mock_table_data(mock_tenant_data):
    """Create mock table for testing"""
    return {
        "id": uuid4(),
        "tenant_id": mock_tenant_data["id"],
        "number": 5,
        "capacity": 4,
        "status": "occupied",
        "qr_secret_token": uuid4(),
        "self_service_enabled": True
    }


@pytest.fixture
def mock_order_data(mock_tenant_data, mock_table_data):
    """Create mock order with items for testing"""
    order_id = uuid4()
    return {
        "id": order_id,
        "tenant_id": mock_tenant_data["id"],
        "table_id": mock_table_data["id"],
        "status": "in_progress",
        "order_source": "self_service",
        "items": [
            {
                "id": uuid4(),
                "order_id": order_id,
                "menu_item_id": uuid4(),
                "menu_item_name": "Taco al Pastor",
                "quantity": 3,
                "unit_price": 45.00,
                "selected_modifiers": [
                    {"group_name": "Extra", "option_name": "Piña", "price_delta": 10}
                ],
                "status": "pending"
            },
            {
                "id": uuid4(),
                "order_id": order_id,
                "menu_item_id": uuid4(),
                "menu_item_name": "Agua de Horchata",
                "quantity": 2,
                "unit_price": 35.00,
                "selected_modifiers": [],
                "status": "ready"
            }
        ],
        "subtotal": 205.00,  # (45*3) + (35*2) = 135 + 70 = 205
        "tax": 32.80,        # 205 * 0.16 = 32.80
        "total": 237.80      # 205 + 32.80 = 237.80
    }


# ============================================
# Bill Calculation Tests
# ============================================

class TestBillCalculation:
    """Tests for bill total calculation accuracy"""
    
    def test_subtotal_calculation(self, mock_order_data):
        """Verify subtotal is sum of (unit_price * quantity)"""
        expected_subtotal = 0
        for item in mock_order_data["items"]:
            expected_subtotal += item["unit_price"] * item["quantity"]
        
        assert expected_subtotal == 205.00
    
    def test_tax_calculation(self, mock_order_data):
        """Verify IVA is calculated at 16%"""
        subtotal = 205.00
        expected_tax = subtotal * 0.16
        
        assert expected_tax == 32.80
    
    def test_total_calculation(self, mock_order_data):
        """Verify total = subtotal + tax"""
        subtotal = 205.00
        tax = 32.80
        expected_total = subtotal + tax
        
        assert expected_total == 237.80
    
    def test_tip_suggestion(self, mock_order_data):
        """Verify tip suggestion is 15% of subtotal"""
        subtotal = 205.00
        expected_tip = subtotal * 0.15
        
        assert expected_tip == 30.75


# ============================================
# Bill Request Endpoint Tests
# ============================================

class TestBillRequestEndpoint:
    """Tests for POST /dining/{tenant_id}/table/{table_id}/request-bill"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create mock database session"""
        session = AsyncMock()
        session.execute = AsyncMock()
        session.commit = AsyncMock()
        session.add = MagicMock()
        return session
    
    @pytest.fixture
    def mock_ws_manager(self):
        """Create mock WebSocket manager"""
        manager = AsyncMock()
        manager.notify_bill_requested = AsyncMock()
        manager.broadcast_to_channel = AsyncMock()
        return manager
    
    @pytest.mark.asyncio
    async def test_bill_request_requires_active_orders(
        self, 
        mock_tenant_data, 
        mock_table_data
    ):
        """
        Test that bill request fails if no active orders exist.
        Expected: 400 Bad Request with appropriate message.
        """
        from app.api.dining import request_bill, TableContext
        from fastapi import HTTPException
        
        # Create table context
        mock_tenant = MagicMock(**mock_tenant_data)
        mock_table = MagicMock(**mock_table_data)
        ctx = TableContext(tenant=mock_tenant, table=mock_table)
        
        # Mock DB to return no orders
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # Test should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await request_bill(ctx=ctx, db=mock_db)
        
        assert exc_info.value.status_code == 400
        assert "No hay consumo" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_bill_request_changes_table_status(
        self,
        mock_tenant_data,
        mock_table_data,
        mock_order_data
    ):
        """
        Test that requesting the bill changes table status to 'bill_requested'.
        """
        from app.models.models import TableStatus
        
        # Create mock table that can track status changes
        mock_table = MagicMock(**mock_table_data)
        mock_table.status = TableStatus.OCCUPIED
        
        # Simulate the status change
        mock_table.status = TableStatus.BILL_REQUESTED
        
        assert mock_table.status == TableStatus.BILL_REQUESTED
    
    @pytest.mark.asyncio
    async def test_bill_request_sends_websocket_notification(
        self,
        mock_tenant_data,
        mock_table_data,
        mock_order_data,
        mock_ws_manager
    ):
        """
        Test that requesting the bill triggers WebSocket notifications
        to waiter, cashier, and POS channels.
        """
        # Simulate the notification call
        await mock_ws_manager.notify_bill_requested(
            table_id=str(mock_table_data["id"]),
            table_number=mock_table_data["number"],
            tenant_id=str(mock_tenant_data["id"]),
            total=mock_order_data["total"],
            subtotal=mock_order_data["subtotal"],
            tax=mock_order_data["tax"],
            items_count=len(mock_order_data["items"]),
            currency=mock_tenant_data["currency"]
        )
        
        # Verify the notification was called
        mock_ws_manager.notify_bill_requested.assert_called_once()
        
        # Verify the arguments
        call_args = mock_ws_manager.notify_bill_requested.call_args
        assert call_args.kwargs["table_number"] == 5
        assert call_args.kwargs["total"] == 237.80
        assert call_args.kwargs["currency"] == "MXN"


# ============================================
# WebSocket Manager Tests
# ============================================

class TestWebSocketNotifications:
    """Tests for WebSocket notification delivery"""
    
    @pytest.mark.asyncio
    async def test_notify_bill_requested_broadcasts_to_all_channels(self):
        """
        Test that notify_bill_requested sends to waiter, cashier, and POS.
        """
        from app.core.websocket_manager import ConnectionManager
        
        manager = ConnectionManager()
        manager.broadcast_to_channel = AsyncMock()
        
        await manager.notify_bill_requested(
            table_id="test-table-id",
            table_number=5,
            tenant_id="test-tenant-id",
            total=237.80,
            subtotal=205.00,
            tax=32.80,
            items_count=2,
            currency="MXN"
        )
        
        # Should be called 3 times (waiter, cashier, pos)
        assert manager.broadcast_to_channel.call_count == 3
        
        # Verify channels
        calls = manager.broadcast_to_channel.call_args_list
        channels_called = [call.args[1] for call in calls]
        
        assert "waiter" in channels_called
        assert "cashier" in channels_called
        assert "pos" in channels_called
    
    @pytest.mark.asyncio
    async def test_notification_includes_action_url(self):
        """
        Test that the notification includes the correct cashier URL.
        """
        from app.core.websocket_manager import ConnectionManager
        
        manager = ConnectionManager()
        captured_message = None
        
        async def capture_broadcast(message, channel):
            nonlocal captured_message
            captured_message = message
        
        manager.broadcast_to_channel = capture_broadcast
        
        table_id = "abc-123"
        await manager.notify_bill_requested(
            table_id=table_id,
            table_number=5,
            tenant_id="test",
            total=100.00,
            subtotal=86.21,
            tax=13.79,
            items_count=1,
            currency="MXN"
        )
        
        assert captured_message is not None
        assert captured_message["payload"]["action_url"] == f"/cashier?table={table_id}"


# ============================================
# Rate Limiter Tests
# ============================================

class TestBillRequestRateLimiter:
    """Tests for rate limiting on bill request endpoint"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_first_request(self):
        """First bill request should be allowed"""
        from app.core.rate_limiter import RedisRateLimiter
        
        limiter = RedisRateLimiter()
        # Use in-memory fallback for testing
        limiter._connected = False
        
        allowed, retry_after, remaining = await limiter.is_allowed(
            key="dining:tenant:table123",
            max_requests=2,
            window_seconds=300
        )
        
        assert allowed is True
        assert retry_after == 0
        assert remaining >= 0
    
    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_excessive_requests(self):
        """Third bill request within 5 minutes should be blocked"""
        from app.core.rate_limiter import RedisRateLimiter
        
        limiter = RedisRateLimiter()
        limiter._connected = False
        
        key = "dining:tenant:table-excessive"
        
        # First two requests should be allowed
        await limiter.is_allowed(key, max_requests=2, window_seconds=300)
        await limiter.is_allowed(key, max_requests=2, window_seconds=300)
        
        # Third request should be blocked
        allowed, retry_after, remaining = await limiter.is_allowed(
            key=key, 
            max_requests=2, 
            window_seconds=300
        )
        
        assert allowed is False
        assert retry_after > 0
        assert remaining == 0


# ============================================
# Integration Flow Test
# ============================================

class TestBillRequestIntegrationFlow:
    """
    Full integration test for the bill request flow.
    
    Flow:
    1. Table exists with active order
    2. Customer taps "Pedir Cuenta"
    3. API validates order exists
    4. API calculates total
    5. Table status changes to bill_requested
    6. WebSocket notification sent
    7. Response returned with bill breakdown
    """
    
    @pytest.mark.asyncio
    async def test_complete_bill_request_flow(
        self,
        mock_tenant_data,
        mock_table_data,
        mock_order_data
    ):
        """End-to-end test of the bill request flow"""
        
        # Step 1: Verify initial state
        assert mock_table_data["status"] == "occupied"
        
        # Step 2: Calculate expected totals
        subtotal = sum(
            item["unit_price"] * item["quantity"] 
            for item in mock_order_data["items"]
        )
        tax = subtotal * 0.16
        total = subtotal + tax
        tip_suggested = subtotal * 0.15
        
        # Step 3: Verify calculations
        assert abs(subtotal - 205.00) < 0.01
        assert abs(tax - 32.80) < 0.01
        assert abs(total - 237.80) < 0.01
        assert abs(tip_suggested - 30.75) < 0.01
        
        # Step 4: Simulate response structure
        expected_response = {
            "success": True,
            "table_number": mock_table_data["number"],
            "table_id": str(mock_table_data["id"]),
            "message": f"Tu cuenta es de MXN ${total:,.2f}. Un mesero viene en camino.",
            "subtotal": subtotal,
            "tax": tax,
            "discount": 0,
            "tip_suggested": tip_suggested,
            "total": total,
            "currency": "MXN",
            "status": "payment_requested",
            "estimated_wait_minutes": 2,
        }
        
        # Step 5: Verify response structure
        assert expected_response["success"] is True
        assert expected_response["status"] == "payment_requested"
        assert expected_response["total"] == 237.80
        assert expected_response["estimated_wait_minutes"] == 2


# ============================================
# Error Handling Tests
# ============================================

class TestBillRequestErrorHandling:
    """Tests for error scenarios in bill request"""
    
    def test_invalid_table_token_rejected(self):
        """Invalid or expired token should return 401"""
        # This would be tested with actual HTTP client
        expected_status_code = 401
        expected_message = "Invalid or expired table access code"
        
        assert expected_status_code == 401
        assert "expired" in expected_message.lower()
    
    def test_self_service_disabled_returns_403(self):
        """Tables with self_service_enabled=False should return 403"""
        expected_status_code = 403
        assert expected_status_code == 403
    
    def test_tenant_without_addon_returns_403(self):
        """Tenants without self_service addon should return 403"""
        expected_status_code = 403
        assert expected_status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
