#!/usr/bin/env python3
"""
RestoNext MX - Database Seed Script
Creates default tenant, admin user, and sample data for testing.

Usage:
    # From apps/api directory:
    python seed_db.py
    
    # Or with make:
    make seed-db
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, async_session_maker, Base
from app.core.security import get_password_hash
from app.models.models import (
    Tenant, User, UserRole, Table, TableStatus,
    MenuCategory, MenuItem, RouteDestination, PrinterTarget
)


# ============================================
# Seed Data Configuration
# ============================================

DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_ADMIN_EMAIL = "admin@restonext.com"
DEFAULT_ADMIN_PASSWORD = "password123"
DEFAULT_ADMIN_NAME = "Administrador"


async def create_tables():
    """Create all database tables if they don't exist."""
    print("📦 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully.")


async def seed_tenant(session: AsyncSession) -> Tenant:
    """Create or get the default tenant."""
    result = await session.execute(
        select(Tenant).where(Tenant.id == DEFAULT_TENANT_ID)
    )
    tenant = result.scalar_one_or_none()
    
    if tenant:
        print(f"📍 Tenant already exists: {tenant.name} ({tenant.slug})")
        return tenant
    
    tenant = Tenant(
        id=DEFAULT_TENANT_ID,
        name="RestoNext Demo",
        slug="restonext-demo",
        legal_name="RestoNext Demo S.A. de C.V.",
        trade_name="RestoNext Demo Restaurant",
        rfc="XAXX010101000",  # RFC genérico para pruebas
        regimen_fiscal="601",  # General de Ley Personas Morales
        uso_cfdi_default="G03",  # Gastos en general
        fiscal_address={
            "street": "Av. Reforma",
            "ext": "123",
            "int": "45",
            "col": "Centro",
            "city": "Ciudad de México",
            "state": "CDMX",
            "cp": "06600",
            "country": "México"
        },
        contacts={
            "email": "contacto@restonext-demo.com",
            "phone": "+52 55 1234 5678",
            "whatsapp": "+52 55 1234 5678"
        },
        ticket_config={
            "header_lines": ["¡Bienvenido a RestoNext Demo!", ""],
            "footer_lines": ["Gracias por su visita", "www.restonext.mx"],
            "show_logo": True
        },
        billing_config={},
        fiscal_config={},
        timezone="America/Mexico_City",
        currency="MXN",
        locale="es-MX",
        onboarding_complete=True,
        onboarding_step="complete",
        active_addons={
            "self_service": True,
            "delivery": False,
            "kds_pro": True,
            "analytics_ai": True
        },
        features_config={},
        is_active=True,
    )
    
    session.add(tenant)
    print(f"✨ Created tenant: {tenant.name}")
    return tenant


async def seed_admin_user(session: AsyncSession, tenant: Tenant) -> User:
    """Create or get the default admin user."""
    result = await session.execute(
        select(User).where(User.email == DEFAULT_ADMIN_EMAIL)
    )
    user = result.scalar_one_or_none()
    
    if user:
        print(f"👤 Admin user already exists: {user.email}")
        return user
    
    user = User(
        tenant_id=tenant.id,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
        name=DEFAULT_ADMIN_NAME,
        role=UserRole.ADMIN,
        is_active=True,
    )
    
    session.add(user)
    print(f"✨ Created admin user: {user.email} (password: {DEFAULT_ADMIN_PASSWORD})")
    return user


async def seed_sample_user(session: AsyncSession, tenant: Tenant, email: str, name: str, role: UserRole, password: str = "password123") -> User:
    """Create a sample user if not exists."""
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user:
        print(f"👤 User already exists: {user.email}")
        return user
    
    user = User(
        tenant_id=tenant.id,
        email=email,
        hashed_password=get_password_hash(password),
        name=name,
        role=role,
        is_active=True,
    )
    session.add(user)
    print(f"✨ Created user: {user.email} ({role.value})")
    return user


async def seed_tables(session: AsyncSession, tenant: Tenant) -> list[Table]:
    """Create sample tables."""
    result = await session.execute(
        select(Table).where(Table.tenant_id == tenant.id)
    )
    existing_tables = result.scalars().all()
    
    if existing_tables:
        print(f"🪑 Tables already exist: {len(existing_tables)} tables")
        return existing_tables
    
    tables = []
    # Create a 4x3 grid of tables
    for i in range(1, 13):
        table = Table(
            tenant_id=tenant.id,
            number=i,
            capacity=4 if i <= 8 else 6,  # Tables 9-12 are larger
            status=TableStatus.FREE,
            pos_x=(i - 1) % 4,
            pos_y=(i - 1) // 4,
            self_service_enabled=True,
        )
        tables.append(table)
        session.add(table)
    
    print(f"✨ Created {len(tables)} tables")
    return tables


async def seed_menu_categories(session: AsyncSession, tenant: Tenant) -> list[MenuCategory]:
    """Create sample menu categories."""
    result = await session.execute(
        select(MenuCategory).where(MenuCategory.tenant_id == tenant.id)
    )
    existing = result.scalars().all()
    
    if existing:
        print(f"📂 Categories already exist: {len(existing)} categories")
        return existing
    
    categories_data = [
        {"name": "Entradas", "description": "Appetizers and starters", "sort_order": 1, "printer_target": PrinterTarget.KITCHEN},
        {"name": "Platos Fuertes", "description": "Main courses", "sort_order": 2, "printer_target": PrinterTarget.KITCHEN},
        {"name": "Bebidas", "description": "Drinks and beverages", "sort_order": 3, "printer_target": PrinterTarget.BAR},
        {"name": "Postres", "description": "Desserts", "sort_order": 4, "printer_target": PrinterTarget.DESSERT},
        {"name": "Cocteles", "description": "Cocktails and mixed drinks", "sort_order": 5, "printer_target": PrinterTarget.BAR},
    ]
    
    categories = []
    for data in categories_data:
        category = MenuCategory(
            tenant_id=tenant.id,
            name=data["name"],
            description=data["description"],
            sort_order=data["sort_order"],
            printer_target=data["printer_target"],
            is_active=True,
        )
        categories.append(category)
        session.add(category)
    
    print(f"✨ Created {len(categories)} menu categories")
    return categories


async def seed_menu_items(session: AsyncSession, tenant: Tenant, categories: list[MenuCategory]) -> list[MenuItem]:
    """Create sample menu items."""
    # Check if items already exist
    result = await session.execute(
        select(MenuItem).limit(1)
    )
    if result.scalar_one_or_none():
        print("🍽️ Menu items already exist")
        return []
    
    # Create a dict for easy category lookup by name
    cat_map = {c.name: c for c in categories}
    
    items_data = [
        # Entradas
        {"name": "Guacamole con Totopos", "price": 95.0, "category": "Entradas", "route_to": RouteDestination.KITCHEN},
        {"name": "Nachos con Queso", "price": 85.0, "category": "Entradas", "route_to": RouteDestination.KITCHEN},
        {"name": "Quesadillas de Champiñones", "price": 75.0, "category": "Entradas", "route_to": RouteDestination.KITCHEN},
        {"name": "Sopa Azteca", "price": 65.0, "category": "Entradas", "route_to": RouteDestination.KITCHEN},
        
        # Platos Fuertes
        {"name": "Tacos al Pastor", "price": 145.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        {"name": "Enchiladas Suizas", "price": 135.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        {"name": "Carne Asada", "price": 195.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        {"name": "Pollo con Mole", "price": 165.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        {"name": "Chilaquiles Verdes", "price": 95.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        {"name": "Burrito Supremo", "price": 125.0, "category": "Platos Fuertes", "route_to": RouteDestination.KITCHEN},
        
        # Bebidas
        {"name": "Agua Fresca de Horchata", "price": 35.0, "category": "Bebidas", "route_to": RouteDestination.BAR},
        {"name": "Limonada Natural", "price": 30.0, "category": "Bebidas", "route_to": RouteDestination.BAR},
        {"name": "Refresco", "price": 25.0, "category": "Bebidas", "route_to": RouteDestination.BAR},
        {"name": "Cerveza Nacional", "price": 45.0, "category": "Bebidas", "route_to": RouteDestination.BAR},
        {"name": "Cerveza Importada", "price": 65.0, "category": "Bebidas", "route_to": RouteDestination.BAR},
        
        # Postres
        {"name": "Churros con Chocolate", "price": 55.0, "category": "Postres", "route_to": RouteDestination.KITCHEN},
        {"name": "Flan Napolitano", "price": 45.0, "category": "Postres", "route_to": RouteDestination.KITCHEN},
        {"name": "Pastel de Tres Leches", "price": 65.0, "category": "Postres", "route_to": RouteDestination.KITCHEN},
        
        # Cocteles
        {"name": "Margarita Clásica", "price": 95.0, "category": "Cocteles", "route_to": RouteDestination.BAR},
        {"name": "Paloma", "price": 85.0, "category": "Cocteles", "route_to": RouteDestination.BAR},
        {"name": "Michelada", "price": 75.0, "category": "Cocteles", "route_to": RouteDestination.BAR},
    ]
    
    items = []
    for data in items_data:
        category = cat_map.get(data["category"])
        if not category:
            continue
            
        item = MenuItem(
            category_id=category.id,
            name=data["name"],
            price=data["price"],
            route_to=data["route_to"],
            is_available=True,
            tax_config={"iva": 0.16},
            sort_order=0,
        )
        items.append(item)
        session.add(item)
    
    print(f"✨ Created {len(items)} menu items")
    return items


async def main():
    """Main seed function."""
    print("\n" + "=" * 50)
    print("🌱 RestoNext MX - Database Seed Script")
    print("=" * 50 + "\n")
    
    try:
        # Create tables first
        await create_tables()
        
        async with async_session_maker() as session:
            # Seed tenant
            tenant = await seed_tenant(session)
            await session.flush()
            
            # Seed admin user
            admin = await seed_admin_user(session, tenant)
            
            # Seed additional sample users
            await seed_sample_user(session, tenant, "mesero@restonext.com", "Juan Mesero", UserRole.WAITER)
            await seed_sample_user(session, tenant, "cocina@restonext.com", "María Cocina", UserRole.KITCHEN)
            await seed_sample_user(session, tenant, "cajero@restonext.com", "Pedro Cajero", UserRole.CASHIER)
            await seed_sample_user(session, tenant, "gerente@restonext.com", "Ana Gerente", UserRole.MANAGER)
            
            # Seed tables
            await seed_tables(session, tenant)
            
            # Seed menu
            categories = await seed_menu_categories(session, tenant)
            await session.flush()  # Ensure categories have IDs
            
            # Refresh categories to get their IDs
            result = await session.execute(
                select(MenuCategory).where(MenuCategory.tenant_id == tenant.id)
            )
            categories = result.scalars().all()
            
            await seed_menu_items(session, tenant, categories)
            
            # Commit all changes
            await session.commit()
            
            print("\n" + "=" * 50)
            print("✅ Database seeded successfully!")
            print("=" * 50)
            print("\n📋 Login Credentials:")
            print(f"   Email:    {DEFAULT_ADMIN_EMAIL}")
            print(f"   Password: {DEFAULT_ADMIN_PASSWORD}")
            print("\n💡 Other test users (same password):")
            print("   - mesero@restonext.com (waiter)")
            print("   - cocina@restonext.com (kitchen)")
            print("   - cajero@restonext.com (cashier)")
            print("   - gerente@restonext.com (manager)")
            print()
            
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
