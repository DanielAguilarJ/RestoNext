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


class UnitOfMeasure(str, enum.Enum):
    """Units for ingredient measurement"""
    KG = "kg"           # Kilogramos
    G = "g"             # Gramos
    LT = "lt"           # Litros
    ML = "ml"           # Mililitros
    PZA = "pza"         # Pieza
    PORCION = "porcion"  # Porción


class TransactionType(str, enum.Enum):
    """Types of inventory transactions"""
    PURCHASE = "purchase"       # Compra/entrada
    SALE = "sale"              # Venta/descuento automático
    ADJUSTMENT = "adjustment"  # Ajuste de inventario
    WASTE = "waste"            # Merma


class PurchaseOrderStatus(str, enum.Enum):
    """Status workflow for purchase orders"""
    DRAFT = "draft"           # Sugerencia generada por sistema
    PENDING = "pending"       # Enviada a proveedor
    APPROVED = "approved"     # Aprobada por gerente
    RECEIVED = "received"     # Mercancía recibida
    CANCELLED = "cancelled"   # Cancelada


class ServiceType(str, enum.Enum):
    """Omnichannel service types"""
    DINE_IN = "dine_in"       # Comedor
    DELIVERY = "delivery"     # Domicilio
    TAKE_AWAY = "take_away"   # Para llevar
    DRIVE_THRU = "drive_thru" # Auto-mac


class ReservationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SEATED = "seated"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class LoyaltyTransactionType(str, enum.Enum):
    EARN = "earn"       # Acumular
    REDEEM = "redeem"   # Redimir
    ADJUSTMENT = "adjustment"



# ============================================
# Tenant / Restaurant Model
# ============================================

class Tenant(Base):
    """
    Restaurant/Business entity.
    Extended for onboarding with fiscal data for CFDI 4.0.
    
    JSONB columns:
    - fiscal_config: Legacy, will be deprecated in favor of structured fields
    - fiscal_address: {street, ext, int, col, city, state, cp, country}
    - contacts: {email, phone, whatsapp}
    - ticket_config: {header_lines, footer_lines, show_logo, additional_notes}
    - billing_config: {pac_provider, csd_cert_path, csd_key_path, csd_password_ref, series, folio_start}
    """
    __tablename__ = "tenants"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Basic identity
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    
    # Business identity (NEW for onboarding)
    legal_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)  # Razón social
    trade_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Nombre comercial
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Fiscal data for CFDI 4.0 (NEW)
    rfc: Mapped[Optional[str]] = mapped_column(String(13), nullable=True)
    regimen_fiscal: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)  # SAT catalog
    uso_cfdi_default: Mapped[str] = mapped_column(String(3), nullable=False, default="G03")
    
    # JSONB for structured fiscal address
    fiscal_address: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # JSONB for contacts
    contacts: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # JSONB for ticket configuration
    ticket_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # JSONB for billing/PAC configuration
    billing_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # Legacy fiscal_config (keeping for backward compatibility)
    fiscal_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # Operational settings (NEW)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Mexico_City")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MXN")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="es-MX")
    
    # Onboarding state (NEW)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[str] = mapped_column(String(32), nullable=False, default="basic")
    
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
    
    # JSONB for tax configuration (replaces fixed 16% IVA)
    # Example: {"iva": 0.16} or {"iva": 0.08, "ieps": 0.265} for alcohol
    tax_config: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default={"iva": 0.16}
    )
    
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    category: Mapped["MenuCategory"] = relationship(back_populates="items")
    recipes: Mapped[List["Recipe"]] = relationship(back_populates="menu_item")


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
    
    # Omnichannel Support (NEW)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    service_type: Mapped[ServiceType] = mapped_column(
        SQLEnum(ServiceType), default=ServiceType.DINE_IN
    )
    # JSONB for delivery info: { "address": "...", "driver_name": "...", "platform": "UberEats" }
    delivery_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    
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
    # Relationships for new modules
    customer: Mapped[Optional["Customer"]] = relationship(back_populates="orders")
    applied_promotions: Mapped[List["OrderPromotion"]] = relationship(back_populates="order")



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


# ============================================
# Inventory Models (Escandallo)
# ============================================

class Ingredient(Base):
    """
    Base ingredients/supplies for inventory tracking.
    Linked to recipes for automatic deduction on sale.
    
    modifier_link JSONB allows linking modifiers to ingredients:
    Example: {"group_name": "Extras", "option_id": "extra_cheese"}
    When this modifier is selected, extra ingredient is deducted.
    """
    __tablename__ = "ingredients"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    unit: Mapped[UnitOfMeasure] = mapped_column(
        SQLEnum(UnitOfMeasure), nullable=False
    )
    
    # Current theoretical stock
    stock_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    min_stock_alert: Mapped[float] = mapped_column(Float, default=0.0)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Optional: link modifiers to ingredients for "Extra Queso" deductions
    modifier_link: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_tenant_ingredient_name'),
    )
    
    # Relationships
    recipes: Mapped[List["Recipe"]] = relationship(back_populates="ingredient")
    transactions: Mapped[List["InventoryTransaction"]] = relationship(
        back_populates="ingredient"
    )
    supplier_ingredients: Mapped[List["SupplierIngredient"]] = relationship(
        back_populates="ingredient"
    )


class Recipe(Base):
    """
    Links MenuItem to Ingredients with quantities (Escandallo).
    Enables automatic inventory deduction on sale.
    
    Example: A "Hamburguesa" might have:
    - 150g of Carne
    - 1 pza of Pan
    - 30g of Queso
    """
    __tablename__ = "recipes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    
    # Amount to deduct per menu item sold
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[UnitOfMeasure] = mapped_column(
        SQLEnum(UnitOfMeasure), nullable=False
    )
    
    # For UI: optional notes (e.g., "cocida", "cruda")
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    __table_args__ = (
        UniqueConstraint(
            'menu_item_id', 'ingredient_id', name='uq_recipe_item_ingredient'
        ),
    )
    
    # Relationships
    menu_item: Mapped["MenuItem"] = relationship(back_populates="recipes")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="recipes")


class InventoryTransaction(Base):
    """
    Audit log for all inventory movements.
    Enables traceability for cost control and auditing.
    
    transaction_type:
    - PURCHASE: Stock increase from supplier
    - SALE: Automatic deduction from order
    - ADJUSTMENT: Manual inventory correction
    - WASTE: Loss/spoilage (merma)
    """
    __tablename__ = "inventory_transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType), nullable=False
    )
    # Positive for entries, negative for exits
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[UnitOfMeasure] = mapped_column(
        SQLEnum(UnitOfMeasure), nullable=False
    )
    
    # Reference to source document (order_id, purchase_id, etc.)
    reference_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    
    # Running balance after transaction
    stock_after: Mapped[float] = mapped_column(Float, nullable=False)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    
    # Relationships
    ingredient: Mapped["Ingredient"] = relationship(back_populates="transactions")


# ============================================
# Procurement Models (Smart Purchasing)
# ============================================

class Supplier(Base):
    """
    Proveedores de ingredientes.
    Each tenant can have multiple suppliers with contact information.
    """
    __tablename__ = "suppliers"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # JSONB for flexible address data
    address: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_tenant_supplier_name'),
    )
    
    # Relationships
    supplier_ingredients: Mapped[List["SupplierIngredient"]] = relationship(
        back_populates="supplier", cascade="all, delete-orphan"
    )
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship(
        back_populates="supplier"
    )


class SupplierIngredient(Base):
    """
    Many-to-many relationship between Suppliers and Ingredients.
    Stores the cost_per_unit for each supplier-ingredient combination.
    Allows tracking which supplier offers the best price for each ingredient.
    """
    __tablename__ = "supplier_ingredients"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    
    cost_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    lead_days: Mapped[int] = mapped_column(Integer, default=1)  # Días de entrega
    min_order_quantity: Mapped[float] = mapped_column(Float, default=1.0)
    
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    __table_args__ = (
        UniqueConstraint('supplier_id', 'ingredient_id', name='uq_supplier_ingredient'),
    )
    
    # Relationships
    supplier: Mapped["Supplier"] = relationship(back_populates="supplier_ingredients")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="supplier_ingredients")


class PurchaseOrder(Base):
    """
    Órdenes de compra a proveedores.
    Supports workflow: DRAFT -> PENDING -> APPROVED -> RECEIVED
    """
    __tablename__ = "purchase_orders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False
    )
    
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        SQLEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT
    )
    
    expected_delivery: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_delivery: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    supplier: Mapped["Supplier"] = relationship(back_populates="purchase_orders")
    items: Mapped[List["PurchaseOrderItem"]] = relationship(
        back_populates="purchase_order", cascade="all, delete-orphan"
    )


class PurchaseOrderItem(Base):
    """
    Líneas de orden de compra.
    Tracks quantity ordered vs quantity received for partial deliveries.
    """
    __tablename__ = "purchase_order_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    
    quantity_ordered: Mapped[float] = mapped_column(Float, nullable=False)
    quantity_received: Mapped[float] = mapped_column(Float, default=0.0)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")
    ingredient: Mapped["Ingredient"] = relationship()


# ============================================
# Catering & Events Models
# ============================================

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUOTING = "quoting"
    WON = "won"
    LOST = "lost"

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QuoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

class EventLead(Base):
    """
    CRM entry for potential catering clients.
    Source of truth before an actual Event is created.
    """
    __tablename__ = "event_leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )

    client_name: Mapped[str] = mapped_column(String(128), nullable=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    event_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    guest_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True) # Wedding, Corporate, etc.
    
    status: Mapped[LeadStatus] = mapped_column(
        SQLEnum(LeadStatus), default=LeadStatus.NEW
    )
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(64), nullable=True) # Web, Referral, etc.
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship()
    events: Mapped[List["Event"]] = relationship(back_populates="lead")


class Event(Base):
    """
    The core Event entity.
    Links to a Customer (User) or is standalone.
    """
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_leads.id"), nullable=True
    )
    
    name: Mapped[str] = mapped_column(String(200), nullable=False) # e.g., "Boda de Ana y Juan"
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    guest_count: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        SQLEnum(EventStatus), default=EventStatus.DRAFT
    )
    
    # Financials
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship()
    lead: Mapped["EventLead"] = relationship(back_populates="events")
    menu_selections: Mapped[List["EventMenuSelection"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    beo: Mapped[Optional["BEO"]] = relationship(back_populates="event", uselist=False)
    quotes: Mapped[List["CateringQuote"]] = relationship(back_populates="event")


class EventMenuSelection(Base):
    """
    Menu items selected for the event.
    Similar to OrderItem but for planning.
    """
    __tablename__ = "event_menu_selections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=False
    )
    
    # Snapshot of name/price at time of selection
    item_name: Mapped[str] = mapped_column(String(128), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="menu_selections")
    menu_item: Mapped["MenuItem"] = relationship()


class BEO(Base):
    """
    Banquet Event Order.
    Contains logistical details, schedule, and specific instructions.
    JSONB used heavily for flexible layout sections.
    """
    __tablename__ = "beos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    # JSONB Structured Data
    # schedule: [{"time": "18:00", "activity": "Cocktail", "notes": "..."}]
    schedule: Mapped[list] = mapped_column(JSONB, default=list)
    
    # setup_instructions: {"tables": "Round", "linen_color": "White", "av_needs": "Projector"}
    setup_instructions: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # internal_notes: for staff only
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="beo")


class CateringQuote(Base):
    """
    Quotes sent to clients (EventView).
    Can be converted to an Invoice.
    """
    __tablename__ = "catering_quotes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    # Valid until
    valid_until: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[QuoteStatus] = mapped_column(
        SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT
    )
    
    # Token for public access (magic link)
    public_token: Mapped[str] = mapped_column(
        String(64), unique=True, default=lambda: str(uuid.uuid4())
    )
    
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    # Relationships
    event: Mapped["Event"] = relationship(back_populates="quotes")


# ============================================
# Loyalty & Customer CRM Models (NEW)
# ============================================

class Customer(Base):
    """
    Central Customer Database (CRM).
    Used for Delivery addresses, Reservations, and Loyalty.
    """
    __tablename__ = "customers"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # JSONB for multiple delivery addresses
    # Example: [{"label": "Casa", "address": "..."}, {"label": "Oficina", "address": "..."}]
    addresses: Mapped[list] = mapped_column(JSONB, default=list)
    
    # Loyalty Status
    loyalty_points: Mapped[float] = mapped_column(Float, default=0.0)
    wallet_balance: Mapped[float] = mapped_column(Float, default=0.0) # Monedero electrónico
    tier_level: Mapped[str] = mapped_column(String(32), default="Bronze")
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'phone', name='uq_tenant_customer_phone'),
        UniqueConstraint('tenant_id', 'email', name='uq_tenant_customer_email'),
    )
    
    # Relationships
    orders: Mapped[List["Order"]] = relationship(back_populates="customer")
    reservations: Mapped[List["Reservation"]] = relationship(back_populates="customer")
    loyalty_transactions: Mapped[List["LoyaltyTransaction"]] = relationship(back_populates="customer")


class LoyaltyTransaction(Base):
    """Audit log for points and wallet balance changes"""
    __tablename__ = "loyalty_transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True
    )
    
    type: Mapped[LoyaltyTransactionType] = mapped_column(SQLEnum(LoyaltyTransactionType))
    points_delta: Mapped[float] = mapped_column(Float, default=0.0)
    amount_delta: Mapped[float] = mapped_column(Float, default=0.0)
    
    description: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    customer: Mapped["Customer"] = relationship(back_populates="loyalty_transactions")


# ============================================
# Reservations & Commissions (NEW)
# ============================================

class CommissionAgent(Base):
    """
    External entities that drive traffic (Concierges, Taxis, Hotels).
    """
    __tablename__ = "commission_agents"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(64), default="concierge")
    commission_rate: Mapped[float] = mapped_column(Float, default=0.10) # 10% defaults
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    reservations: Mapped[List["Reservation"]] = relationship(back_populates="agent")


class Reservation(Base):
    """Table reservations with optional Agent commission"""
    __tablename__ = "reservations"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commission_agents.id"), nullable=True
    )
    table_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True
    )
    
    reservation_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, default=2)
    status: Mapped[ReservationStatus] = mapped_column(
        SQLEnum(ReservationStatus), default=ReservationStatus.PENDING
    )
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSONB, default=list) # ["birthday", "anniversary"]
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="reservations")
    agent: Mapped["CommissionAgent"] = relationship(back_populates="reservations")
    table: Mapped["Table"] = relationship()


# ============================================
# Promotions Engine (NEW)
# ============================================

class Promotion(Base):
    """
    Flexible promotion rules engine.
    Examples:
    - 2x1 Beers on Thursdays 18:00-20:00
    - Combo Burger + Soda = $150
    """
    __tablename__ = "promotions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # JSONB Rules Engine
    # {
    #   "days": [1, 4], # Mon, Thu
    #   "time_start": "18:00",
    #   "time_end": "20:00",
    #   "buy_item_ids": ["uuid..."],
    #   "min_qty": 2
    # }
    rules: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # JSONB Effect
    # { "type": "discount_percentage", "value": 50 } 
    # { "type": "fixed_price", "value": 150 }
    effect: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    applied_orders: Mapped[List["OrderPromotion"]] = relationship(back_populates="promotion")


class OrderPromotion(Base):
    """Tracks which promotions were applied to an order for analytics"""
    __tablename__ = "order_promotions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False
    )
    promotion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promotions.id"), nullable=False
    )
    
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    order: Mapped["Order"] = relationship(back_populates="applied_promotions")
    promotion: Mapped["Promotion"] = relationship(back_populates="applied_orders")

