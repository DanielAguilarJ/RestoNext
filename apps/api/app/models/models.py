"""
RestoNext MX - SQLAlchemy Models
PostgreSQL with JSONB columns for flexible data structures

ARCHITECTURAL DECISIONS:
1. JSONB for fiscal_config: Allows changing fiscal settings without migrations
2. JSONB for modifiers_schema: Complex menu options without 5-level joins
3. JSONB for selected_modifiers: Captures customer choices at order time
4. UUID primary keys: Better for distributed systems and security
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, 
    Text, Enum as SQLEnum, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


# ============================================
# Enums
# ============================================

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WAITER = "waiter"
    KITCHEN = "kitchen"
    CASHIER = "cashier"


class OrderStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    DELIVERED = "delivered"
    PAID = "paid"
    CANCELLED = "cancelled"


class TableStatus(str, enum.Enum):
    FREE = "free"
    OCCUPIED = "occupied"
    BILL_REQUESTED = "bill_requested"


class OrderItemStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"


class RouteDestination(str, enum.Enum):
    KITCHEN = "kitchen"
    BAR = "bar"


class CFDIStatus(str, enum.Enum):
    PENDING = "pending"
    STAMPED = "stamped"
    CANCELLED = "cancelled"
    ERROR = "error"


class SplitType(str, enum.Enum):
    BY_SEAT = "by_seat"
    EVEN = "even"
    CUSTOM = "custom"


# ============================================
# Tenant / Restaurant Model
# ============================================

class Tenant(Base):
    """
    Restaurant/Business entity.
    fiscal_config JSONB stores RFC, Régimen Fiscal, CSD paths.
    """
    __tablename__ = "tenants"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    
    # JSONB for fiscal configuration - avoids migrations when SAT rules change
    # Structure: {rfc, razon_social, regimen_fiscal, codigo_postal, csd_paths...}
    fiscal_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    users: Mapped[List["User"]] = relationship(back_populates="tenant")
    menu_categories: Mapped[List["MenuCategory"]] = relationship(back_populates="tenant")
    tables: Mapped[List["Table"]] = relationship(back_populates="tenant")
    orders: Mapped[List["Order"]] = relationship(back_populates="tenant")


# ============================================
# User Model
# ============================================

class User(Base):
    """Users with role-based access control"""
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), nullable=False, default=UserRole.WAITER
    )
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    orders: Mapped[List["Order"]] = relationship(back_populates="waiter")


# ============================================
# Menu Models
# ============================================

class MenuCategory(Base):
    """Menu categories (Appetizers, Main Courses, Drinks, etc.)"""
    __tablename__ = "menu_categories"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="menu_categories")
    items: Mapped[List["MenuItem"]] = relationship(back_populates="category")


class MenuItem(Base):
    """
    Menu items with JSONB modifiers_schema.
    
    modifiers_schema example:
    {
        "groups": [
            {
                "name": "Protein",
                "required": true,
                "min_select": 1,
                "max_select": 1,
                "options": [
                    {"id": "beef", "name": "Carne Asada", "price_delta": 0},
                    {"id": "chicken", "name": "Pollo", "price_delta": -15}
                ]
            }
        ]
    }
    
    WHY JSONB: Allows changing modifier options without database migrations.
    Restaurant menus change weekly - this avoids schema changes.
    """
    __tablename__ = "menu_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_categories.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Where this item should appear: Kitchen or Bar display
    route_to: Mapped[RouteDestination] = mapped_column(
        SQLEnum(RouteDestination), default=RouteDestination.KITCHEN
    )
    
    # JSONB for complex modifier logic
    modifiers_schema: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    category: Mapped["MenuCategory"] = relationship(back_populates="items")


# ============================================
# Table Model
# ============================================

class Table(Base):
    """Restaurant tables with status tracking"""
    __tablename__ = "tables"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[TableStatus] = mapped_column(
        SQLEnum(TableStatus), default=TableStatus.FREE
    )
    
    # Position for visual table map (grid coordinates)
    pos_x: Mapped[int] = mapped_column(Integer, default=0)
    pos_y: Mapped[int] = mapped_column(Integer, default=0)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'number', name='uq_tenant_table_number'),
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="tables")
    orders: Mapped[List["Order"]] = relationship(back_populates="table")


# ============================================
# Order Models
# ============================================

class Order(Base):
    """
    Order header containing table info and overall status.
    Items are stored separately in OrderItem.
    """
    __tablename__ = "orders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    table_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id"), nullable=False
    )
    waiter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus), default=OrderStatus.OPEN
    )
    
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)  # IVA 16%
    total: Mapped[float] = mapped_column(Float, default=0.0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="orders")
    table: Mapped["Table"] = relationship(back_populates="orders")
    waiter: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order")
    bill_splits: Mapped[List["BillSplit"]] = relationship(back_populates="order")
    invoices: Mapped[List["Invoice"]] = relationship(back_populates="order")


class OrderItem(Base):
    """
    Individual items in an order.
    selected_modifiers JSONB captures customer choices at order time.
    
    selected_modifiers example:
    [
        {"group_name": "Protein", "option_id": "beef", "option_name": "Carne Asada", "price_delta": 0},
        {"group_name": "Extras", "option_id": "guac", "option_name": "Guacamole", "price_delta": 25}
    ]
    """
    __tablename__ = "order_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=False
    )
    
    # Denormalized for quick display (avoid join on kitchen display)
    menu_item_name: Mapped[str] = mapped_column(String(128), nullable=False)
    route_to: Mapped[RouteDestination] = mapped_column(
        SQLEnum(RouteDestination), default=RouteDestination.KITCHEN
    )
    
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    
    # JSONB for selected modifiers
    selected_modifiers: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    
    # Seat number for split checks
    seat_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[OrderItemStatus] = mapped_column(
        SQLEnum(OrderItemStatus), default=OrderItemStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    order: Mapped["Order"] = relationship(back_populates="items")


# ============================================
# Bill Split Model
# ============================================

class BillSplit(Base):
    """
    Supports splitting checks by seat, evenly, or custom drag-and-drop.
    splits JSONB stores the split details.
    
    splits example:
    [
        {"split_number": 1, "item_ids": ["uuid1", "uuid2"], "amount": 250.00, "paid": false},
        {"split_number": 2, "item_ids": ["uuid3"], "amount": 120.00, "paid": true, "payment_method": "card"}
    ]
    """
    __tablename__ = "bill_splits"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    
    split_type: Mapped[SplitType] = mapped_column(
        SQLEnum(SplitType), nullable=False
    )
    
    # JSONB for flexible split details
    splits: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    order: Mapped["Order"] = relationship(back_populates="bill_splits")


# ============================================
# Invoice / CFDI Model
# ============================================

class Invoice(Base):
    """
    CFDI 4.0 compliant invoices.
    Stores SAT UUID after stamping, PDF/XML paths, and SAT response.
    """
    __tablename__ = "invoices"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    # SAT UUID after successful stamping
    uuid: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[CFDIStatus] = mapped_column(
        SQLEnum(CFDIStatus), default=CFDIStatus.PENDING
    )
    
    # Receptor (Customer) data
    receptor_rfc: Mapped[str] = mapped_column(String(13), nullable=False)
    receptor_nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    receptor_cp: Mapped[str] = mapped_column(String(5), nullable=False)
    uso_cfdi: Mapped[str] = mapped_column(String(3), nullable=False, default="G03")
    
    # Financial data
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    iva: Mapped[float] = mapped_column(Float, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)
    
    # File paths after generation
    pdf_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    xml_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # SAT response for debugging/auditing
    sat_response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    order: Mapped["Order"] = relationship(back_populates="invoices")


# ============================================
# Sales Data for AI Forecasting
# ============================================

class DailySales(Base):
    """
    Aggregated daily sales data for Prophet forecasting.
    Ingredient-level tracking for demand prediction.
    """
    __tablename__ = "daily_sales"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ingredient: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity_sold: Mapped[float] = mapped_column(Float, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'date', 'ingredient', name='uq_daily_sales'),
    )
