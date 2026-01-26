
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Tenant, Order, OrderItem, OrderStatus, OrderItemStatus, UserRole

# Mock Data
MOCK_TENANT_ID = uuid4()
MOCK_USER_ID = uuid4()
MOCK_ORDER_ID = uuid4()
MOCK_ITEM_ID = uuid4()

# Mock Dependencies
async def mock_get_db():
    mock_session = AsyncMock()
    
    # Mock tenant for config
    mock_tenant = Tenant(
        id=MOCK_TENANT_ID, 
        features_config={"kds": {"mode": "restaurant"}}
    )
    
    # Mock order
    mock_order = Order(
        id=MOCK_ORDER_ID,
        tenant_id=MOCK_TENANT_ID,
        status=OrderStatus.PENDING_PAYMENT,
        total=150.0,
        paid_at=None,
        created_at=datetime.utcnow()
    )
    
    # Mock item
    mock_item = OrderItem(
        id=MOCK_ITEM_ID,
        order_id=MOCK_ORDER_ID,
        status=OrderItemStatus.PENDING,
        menu_item_name="Café Americano",
        quantity=1
    )

    # Setup get/execute behavior
    async def get_side_effect(model, id):
        if model == Tenant:
            return mock_tenant
        if model == Order and str(id) == str(MOCK_ORDER_ID):
            return mock_order
        if model == OrderItem and str(id) == str(MOCK_ITEM_ID):
            return mock_item
        return None

    mock_session.get = AsyncMock(side_effect=get_side_effect)
    
    # Mock execute result for lists
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_order]
    mock_session.execute.return_value = mock_result
    
    yield mock_session

async def mock_get_current_user():
    return User(
        id=MOCK_USER_ID,
        tenant_id=MOCK_TENANT_ID,
        role=UserRole.ADMIN,
        email="admin@test.com"
    )

# Apply overrides
app.dependency_overrides[get_db] = mock_get_db
app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

def test_kds_config_flow():
    """Test getting and updating KDS configuration"""
    # 1. Get Config
    response = client.get("/kds/config")
    assert response.status_code == 200
    data = response.json()
    assert "mode" in data
    assert "warning_minutes" in data
    
    # 2. Update Config
    new_config = {
        "mode": "cafeteria",
        "warning_minutes": 8,
        "critical_minutes": 15,
        "audio_alerts": True,
        "shake_animation": False
    }
    response = client.patch("/kds/config", json=new_config)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "cafeteria"
    assert data["warning_minutes"] == 8

def test_mark_order_paid_flow():
    """Test marking order as paid and sending to kitchen"""
    # 1. Mark Paid
    response = client.post(f"/kds/orders/{MOCK_ORDER_ID}/paid", json={
        "payment_method": "card",
        "notes": "Test payment"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert "paid_at" in data

def test_kitchen_status_update_flow():
    """Test kitchen updating order status"""
    # 1. Update Order Status
    response = client.patch(f"/kds/orders/{MOCK_ORDER_ID}/status", json={
        "status": "ready"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"

def test_kitchen_item_update_flow():
    """Test kitchen updating item status"""
    # 1. Update Item Status
    response = client.patch(f"/kds/items/{MOCK_ITEM_ID}/status", json={
        "status": "preparing"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "preparing"

def test_invalid_transitions():
    """Test error handling for invalid states"""
    # Invalid status
    response = client.patch(f"/kds/orders/{MOCK_ORDER_ID}/status", json={
        "status": "invalid_status"
    })
    assert response.status_code == 400
