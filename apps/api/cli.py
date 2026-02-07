#!/usr/bin/env python3
"""
RestoNext MX - CLI Management Tool
===================================
Command-line interface for administrative operations.

Usage:
    python cli.py create-tenant --name "Mi Restaurante" --email "admin@mirestaurante.mx" --plan professional
    python cli.py list-tenants
    python cli.py run-job daily_close
    python cli.py scheduler-status

Requirements:
    pip install typer[all] asyncio

Author: RestoNext Team
"""

import asyncio
import sys
import re
from datetime import datetime
from typing import Optional
from uuid import uuid4

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

# Add app to path for imports
sys.path.insert(0, ".")

from app.core.database import async_session_maker, init_db
from app.core.security import get_password_hash
from app.models.models import (
    Tenant, User, UserRole, Table, TableStatus,
    Ingredient, UnitOfMeasure
)

# Initialize Typer app
app = typer.Typer(
    name="restonext",
    help="🍽️ RestoNext MX - CLI Management Tool",
    add_completion=False
)

console = Console()

# ============================================
# Plan Configurations
# ============================================
PLAN_CONFIGS = {
    "starter": {
        "description": "Para restaurantes pequeños",
        "max_tables": 10,
        "addons": {"self_service": True, "delivery": False, "kds_pro": False, "analytics_ai": False},
        "features": {"self_service": {"allow_bill_request": True}}
    },
    "professional": {
        "description": "Para restaurantes medianos",
        "max_tables": 30,
        "addons": {"self_service": True, "delivery": True, "kds_pro": True, "analytics_ai": False},
        "features": {"self_service": {"allow_bill_request": True}}
    },
    "enterprise": {
        "description": "Para cadenas y franquicias",
        "max_tables": 100,
        "addons": {"self_service": True, "delivery": True, "kds_pro": True, "analytics_ai": True},
        "features": {"self_service": {"allow_bill_request": True, "require_deposit": False}}
    }
}


# ============================================
# Helper Functions
# ============================================

def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from name."""
    slug = name.lower().strip()
    slug = re.sub(r'[áàäâã]', 'a', slug)
    slug = re.sub(r'[éèëê]', 'e', slug)
    slug = re.sub(r'[íìïî]', 'i', slug)
    slug = re.sub(r'[óòöôõ]', 'o', slug)
    slug = re.sub(r'[úùüû]', 'u', slug)
    slug = re.sub(r'[ñ]', 'n', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    # Add random suffix for uniqueness
    return f"{slug}-{str(uuid4())[:6]}"


async def _send_welcome_email(
    to_email: str,
    tenant_name: str,
    admin_name: str,
    email: str,
    password: str
) -> bool:
    """Send welcome email with credentials to new tenant admin."""
    try:
        from app.services.email_service import get_email_service
        email_service = get_email_service()
        return await email_service.send_welcome_email(
            to_email=to_email,
            tenant_name=tenant_name,
            admin_name=admin_name,
            email=email,
            password=password
        )
    except ImportError:
        console.print("[yellow]Email service not available[/yellow]")
        return False


async def _create_tenant_async(
    name: str,
    email: str,
    plan: str,
    password: str,
    admin_name: str,
    rfc: Optional[str],
    phone: Optional[str]
) -> dict:
    """Async implementation of tenant creation."""
    
    if plan not in PLAN_CONFIGS:
        raise ValueError(f"Invalid plan: {plan}. Must be one of: {', '.join(PLAN_CONFIGS.keys())}")
    
    plan_config = PLAN_CONFIGS[plan]
    
    async with async_session_maker() as db:
        try:
            # Create Tenant
            tenant = Tenant(
                id=uuid4(),
                name=name,
                slug=generate_slug(name),
                legal_name=name,
                trade_name=name,
                rfc=rfc,
                contacts={"email": email, "phone": phone or ""},
                active_addons=plan_config["addons"],
                features_config=plan_config["features"],
                onboarding_complete=False,
                onboarding_step="basic",
                is_active=True,
                timezone="America/Mexico_City",
                currency="MXN",
                locale="es-MX"
            )
            db.add(tenant)
            await db.flush()  # Get tenant ID
            
            # Create Admin User
            admin_user = User(
                id=uuid4(),
                tenant_id=tenant.id,
                email=email,
                hashed_password=get_password_hash(password),
                name=admin_name,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            
            # Create System User (for automated operations)
            system_user = User(
                id=uuid4(),
                tenant_id=tenant.id,
                email=f"system@{tenant.slug}.local",
                hashed_password=get_password_hash(str(uuid4())),  # Random password
                name="Sistema",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(system_user)
            await db.flush()
            
            # Create Default Tables
            max_tables = min(plan_config["max_tables"], 10)  # Start with first 10
            for i in range(1, max_tables + 1):
                table = Table(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    number=i,
                    capacity=4,
                    status=TableStatus.FREE,
                    pos_x=(i - 1) % 5,
                    pos_y=(i - 1) // 5,
                    self_service_enabled=plan_config["addons"].get("self_service", False)
                )
                db.add(table)
            
            # Create Basic Ingredients (Common for Mexican restaurants)
            base_ingredients = [
                ("Carne de Res", UnitOfMeasure.KG, 10.0, 2.0, 180.0),
                ("Pollo", UnitOfMeasure.KG, 8.0, 2.0, 95.0),
                ("Tortilla de Maíz", UnitOfMeasure.PZA, 500.0, 100.0, 1.50),
                ("Queso Oaxaca", UnitOfMeasure.KG, 5.0, 1.0, 120.0),
                ("Cebolla", UnitOfMeasure.KG, 10.0, 2.0, 25.0),
                ("Tomate", UnitOfMeasure.KG, 10.0, 2.0, 35.0),
                ("Aceite", UnitOfMeasure.LT, 20.0, 5.0, 45.0),
                ("Sal", UnitOfMeasure.KG, 5.0, 1.0, 15.0),
            ]
            
            for ing_name, unit, stock, min_stock, cost in base_ingredients:
                ingredient = Ingredient(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    name=ing_name,
                    sku=f"ING-{str(uuid4())[:8].upper()}",
                    unit=unit,
                    stock_quantity=stock,
                    min_stock_alert=min_stock,
                    cost_per_unit=cost,
                    is_active=True
                )
                db.add(ingredient)
            
            await db.commit()
            
            return {
                "tenant_id": str(tenant.id),
                "tenant_slug": tenant.slug,
                "admin_user_id": str(admin_user.id),
                "admin_email": email,
                "plan": plan,
                "tables_created": max_tables,
                "ingredients_created": len(base_ingredients)
            }
            
        except Exception as e:
            await db.rollback()
            raise e


# ============================================
# CLI Commands
# ============================================

@app.command("create-tenant")
def create_tenant(
    name: str = typer.Option(..., "--name", "-n", help="Restaurant name"),
    email: str = typer.Option(..., "--email", "-e", help="Admin email"),
    plan: str = typer.Option("professional", "--plan", "-p", help="Plan: starter, professional, enterprise"),
    password: str = typer.Option("RestoNext2024!", "--password", help="Admin password"),
    admin_name: str = typer.Option("Administrador", "--admin-name", help="Admin user display name"),
    rfc: Optional[str] = typer.Option(None, "--rfc", help="RFC for fiscal data"),
    phone: Optional[str] = typer.Option(None, "--phone", help="Contact phone"),
):
    """
    🏪 Create a new tenant (restaurant) with all default configurations.
    
    This command will:
    - Create the tenant entity
    - Create an admin user
    - Create default tables
    - Set up basic ingredients inventory
    
    Example:
        python cli.py create-tenant --name "Tacos El Patrón" --email "admin@elpatron.mx" --plan enterprise
    """
    console.print(Panel.fit(
        f"[bold blue]Creating new tenant:[/bold blue] [green]{name}[/green]",
        title="🍽️ RestoNext"
    ))
    
    if plan not in PLAN_CONFIGS:
        console.print(f"[red]❌ Invalid plan: {plan}[/red]")
        console.print(f"Available plans: {', '.join(PLAN_CONFIGS.keys())}")
        raise typer.Exit(1)
    
    console.print(f"  📋 Plan: [cyan]{plan}[/cyan] - {PLAN_CONFIGS[plan]['description']}")
    console.print(f"  📧 Email: [cyan]{email}[/cyan]")
    
    with console.status("[bold green]Creating tenant..."):
        try:
            result = asyncio.run(_create_tenant_async(
                name=name,
                email=email,
                plan=plan,
                password=password,
                admin_name=admin_name,
                rfc=rfc,
                phone=phone
            ))
            
            console.print("\n[bold green]✅ Tenant created successfully![/bold green]\n")
            
            # Display results table
            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="white")
            
            table.add_row("Tenant ID", result["tenant_id"])
            table.add_row("Slug", result["tenant_slug"])
            table.add_row("Admin User ID", result["admin_user_id"])
            table.add_row("Admin Email", result["admin_email"])
            table.add_row("Plan", result["plan"])
            table.add_row("Tables Created", str(result["tables_created"]))
            table.add_row("Ingredients Created", str(result["ingredients_created"]))
            
            console.print(table)
            
            # Send welcome email with credentials
            console.print("\n[bold blue]📧 Sending welcome email...[/bold blue]")
            try:
                email_sent = asyncio.run(_send_welcome_email(
                    to_email=email,
                    tenant_name=name,
                    admin_name=admin_name,
                    email=email,
                    password=password
                ))
                if email_sent:
                    console.print("[green]✅ Welcome email sent successfully![/green]")
                else:
                    console.print("[yellow]⚠️ Email service disabled - credentials not sent[/yellow]")
            except Exception as email_error:
                console.print(f"[yellow]⚠️ Could not send email: {email_error}[/yellow]")
            
            console.print("\n[yellow]📝 Next steps:[/yellow]")
            console.print(f"   1. Login at https://restonext.vercel.app/login")
            console.print(f"   2. Complete onboarding wizard")
            console.print(f"   3. Configure menu and prices")
            
        except Exception as e:
            console.print(f"\n[red]❌ Error creating tenant: {str(e)}[/red]")
            raise typer.Exit(1)


@app.command("list-tenants")
def list_tenants(
    active_only: bool = typer.Option(True, "--active-only/--all", help="Show only active tenants")
):
    """
    📋 List all tenants in the system.
    """
    async def _list():
        from sqlalchemy import select
        async with async_session_maker() as db:
            query = select(Tenant)
            if active_only:
                query = query.where(Tenant.is_active == True)
            query = query.order_by(Tenant.created_at.desc())
            
            result = await db.execute(query)
            return result.scalars().all()
    
    tenants = asyncio.run(_list())
    
    if not tenants:
        console.print("[yellow]No tenants found.[/yellow]")
        return
    
    table = Table(show_header=True, header_style="bold magenta", title="🍽️ Tenants")
    table.add_column("Name", style="cyan")
    table.add_column("Slug", style="white")
    table.add_column("Status", style="green")
    table.add_column("Created", style="dim")
    
    for t in tenants:
        status = "✅ Active" if t.is_active else "❌ Inactive"
        table.add_row(
            t.name,
            t.slug,
            status,
            t.created_at.strftime("%Y-%m-%d %H:%M")
        )
    
    console.print(table)
    console.print(f"\n[dim]Total: {len(tenants)} tenant(s)[/dim]")


@app.command("run-job")
def run_job(
    job_name: str = typer.Argument(..., help="Job name: daily_close, inventory_snapshot, expire_points")
):
    """
    ⚡ Manually trigger a scheduled job.
    
    Available jobs:
    - daily_close: Close stale orders
    - inventory_snapshot: Create inventory snapshot
    - expire_points: Process expired loyalty points
    """
    from app.core.scheduler import run_job_manually
    
    console.print(f"[bold blue]Running job:[/bold blue] [green]{job_name}[/green]")
    
    with console.status(f"[bold green]Executing {job_name}..."):
        result = asyncio.run(run_job_manually(job_name))
    
    if result["status"] == "success":
        console.print(f"\n[green]✅ {result['message']}[/green]")
    else:
        console.print(f"\n[red]❌ {result['message']}[/red]")
        raise typer.Exit(1)


@app.command("scheduler-status")
def scheduler_status():
    """
    📊 Show scheduler status and next run times.
    """
    from app.core.scheduler import get_scheduler_status
    
    status = get_scheduler_status()
    
    if not status["running"]:
        console.print("[yellow]⚠️ Scheduler is not running[/yellow]")
        console.print("[dim]Start the API server to activate the scheduler.[/dim]")
        return
    
    console.print(f"[green]✅ Scheduler is running[/green]")
    console.print(f"[dim]Timezone: {status['timezone']}[/dim]\n")
    
    table = Table(show_header=True, header_style="bold magenta", title="📅 Scheduled Jobs")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Next Run", style="green")
    
    for job in status["jobs"]:
        table.add_row(job["id"], job["name"], job["next_run"] or "N/A")
    
    console.print(table)


@app.command("init-db")
def init_database():
    """
    🗄️ Initialize database tables.
    """
    console.print("[bold blue]Initializing database...[/bold blue]")
    
    with console.status("[bold green]Creating tables..."):
        asyncio.run(init_db())
    
    console.print("[green]✅ Database initialized successfully![/green]")


@app.command("version")
def version():
    """
    ℹ️ Show version information.
    """
    console.print(Panel.fit(
        "[bold cyan]RestoNext MX[/bold cyan]\n"
        "Version: [green]1.0.0[/green]\n"
        "Python Restaurant Management SaaS\n\n"
        f"[dim]Build Date: {datetime.now().strftime('%Y-%m-%d')}[/dim]",
        title="🍽️ About",
        border_style="cyan"
    ))


# ============================================
# Demo Seeding Command
# ============================================

async def _seed_demo_data_async(tenant_id: str) -> dict:
    """
    Create realistic demo data for a tenant.
    
    Creates:
    - 5 employees (various roles)
    - Complete menu (4 categories, 20 dishes)
    - 50 past orders (for analytics/charts)
    - Initial inventory
    """
    import random
    from datetime import timedelta
    from sqlalchemy import select
    from app.models.models import (
        MenuCategory, MenuItem, RouteDestination,
        Order, OrderItem, OrderStatus, OrderSource, OrderItemStatus,
        ServiceType
    )
    
    async with async_session_maker() as db:
        # Verify tenant exists
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")
        
        stats = {
            "employees": 0,
            "categories": 0,
            "menu_items": 0,
            "orders": 0,
            "order_items": 0,
            "ingredients": 0
        }
        
        # ==========================================
        # 1. Create Employees
        # ==========================================
        employees_data = [
            ("María García", "maria@demo.restaurant", UserRole.WAITER),
            ("Carlos Rodríguez", "carlos@demo.restaurant", UserRole.WAITER),
            ("Ana López", "ana@demo.restaurant", UserRole.KITCHEN),
            ("Luis Hernández", "luis@demo.restaurant", UserRole.KITCHEN),
            ("Sofia Martínez", "sofia@demo.restaurant", UserRole.CASHIER),
        ]
        
        created_users = []
        for name, email, role in employees_data:
            # Check if exists
            existing = await db.execute(
                select(User).where(User.email == email)
            )
            if existing.scalar_one_or_none():
                continue
                
            user = User(
                id=uuid4(),
                tenant_id=tenant.id,
                name=name,
                email=email,
                hashed_password=get_password_hash("Demo2024!"),
                role=role,
                is_active=True
            )
            db.add(user)
            created_users.append(user)
        
        await db.flush()
        stats["employees"] = len(created_users)
        
        # ==========================================
        # 2. Create Menu Categories & Items
        # ==========================================
        menu_data = {
            "🥗 Entradas": [
                ("Guacamole con Totopos", "Guacamole fresco preparado al momento con aguacate Hass, cebolla, cilantro y chile serrano. Servido con totopos crujientes.", 145.00, "https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400"),
                ("Quesadillas de Flor de Calabaza", "Tres quesadillas de tortilla de maíz azul con flor de calabaza, queso Oaxaca y epazote.", 135.00, "https://images.unsplash.com/photo-1628181915535-a2e2fac9bdd3?w=400"),
                ("Tostadas de Tinga", "Dos tostadas de pollo en salsa de chipotle con crema, queso fresco y aguacate.", 125.00, "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400"),
                ("Sopa Azteca", "Sopa de tortilla con chile pasilla, aguacate, crema y queso Oaxaca.", 95.00, "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"),
                ("Coctel de Camarón", "Camarones frescos en salsa cóctel con aguacate, cilantro y galletas saladas.", 210.00, "https://images.unsplash.com/photo-1565558118227-28e1a3a7f1c1?w=400"),
            ],
            "🌮 Platos Fuertes": [
                ("Tacos al Pastor", "Tres tacos de cerdo adobado cocinado en trompo, con piña, cilantro y cebolla.", 185.00, "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400"),
                ("Enchiladas Suizas", "Tres enchiladas de pollo bañadas en salsa verde cremosa con queso gratinado.", 195.00, "https://images.unsplash.com/photo-1583912267550-d974311a9a6e?w=400"),
                ("Mole Poblano con Pollo", "Pechuga de pollo en mole tradicional de 28 ingredientes, con arroz rojo.", 245.00, "https://images.unsplash.com/photo-1599789197514-47270cd526b4?w=400"),
                ("Arrachera a la Parrilla", "300g de arrachera marinada con nopales, cebollas cambray y guacamole.", 345.00, "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400"),
                ("Chiles Rellenos", "Dos chiles poblanos rellenos de queso y picadillo, bañados en caldillo de tomate.", 225.00, "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400"),
                ("Pescado a la Veracruzana", "Filete de huachinango en salsa de tomate, aceitunas, alcaparras y chiles güeros.", 295.00, "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400"),
                ("Carnitas Michoacanas", "Carnitas tradicionales con salsa verde, cebolla, cilantro y tortillas.", 275.00, "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400"),
            ],
            "🍰 Postres": [
                ("Churros con Chocolate", "Cuatro churros crujientes espolvoreados con azúcar y canela, con chocolate caliente.", 95.00, "https://images.unsplash.com/photo-1565735513753-1d9a51d6f75f?w=400"),
                ("Flan Napolitano", "Flan cremoso de vainilla con caramelo casero.", 85.00, "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400"),
                ("Tres Leches", "Bizcocho empapado en tres leches con merengue italiano.", 110.00, "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400"),
                ("Helado de Mamey", "Dos bolas de helado artesanal de mamey con galleta.", 75.00, "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400"),
            ],
            "🍹 Bebidas": [
                ("Agua de Horchata", "Agua fresca de arroz con canela y vainilla (1L).", 55.00, "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400"),
                ("Limonada con Chía", "Limonada natural con semillas de chía (1L).", 50.00, "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400"),
                ("Margarita Clásica", "Tequila, triple sec, jugo de limón y sal.", 145.00, "https://images.unsplash.com/photo-1546171753-e89fd5b81ea2?w=400"),
                ("Cerveza Artesanal", "Cerveza local IPA o Lager (473ml).", 95.00, "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=400"),
            ],
        }
        
        created_items = []
        for cat_name, items in menu_data.items():
            # Check if category exists
            existing_cat = await db.execute(
                select(MenuCategory).where(
                    MenuCategory.tenant_id == tenant.id,
                    MenuCategory.name == cat_name
                )
            )
            category = existing_cat.scalar_one_or_none()
            
            if not category:
                category = MenuCategory(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    name=cat_name,
                    description=f"Deliciosos platillos de la sección {cat_name}",
                    sort_order=len(stats) + 1,
                    is_active=True
                )
                db.add(category)
                await db.flush()
                stats["categories"] += 1
            
            for item_name, description, price, image_url in items:
                # Check if item exists
                existing_item = await db.execute(
                    select(MenuItem).where(
                        MenuItem.category_id == category.id,
                        MenuItem.name == item_name
                    )
                )
                if existing_item.scalar_one_or_none():
                    continue
                
                route = RouteDestination.BAR if "Bebidas" in cat_name else RouteDestination.KITCHEN
                
                menu_item = MenuItem(
                    id=uuid4(),
                    category_id=category.id,
                    name=item_name,
                    description=description,
                    price=price,
                    image_url=image_url,
                    route_to=route,
                    is_available=True,
                    tax_config={"iva": 0.16}
                )
                db.add(menu_item)
                created_items.append(menu_item)
        
        await db.flush()
        stats["menu_items"] = len(created_items)
        
        # Get all menu items for order simulation
        all_items_result = await db.execute(
            select(MenuItem).join(MenuCategory).where(
                MenuCategory.tenant_id == tenant.id
            )
        )
        all_menu_items = list(all_items_result.scalars().all())
        
        # Get tables
        tables_result = await db.execute(
            select(Table).where(Table.tenant_id == tenant.id)
        )
        tables = list(tables_result.scalars().all())
        
        # Get users (waiters)
        users_result = await db.execute(
            select(User).where(User.tenant_id == tenant.id)
        )
        users = list(users_result.scalars().all())
        
        if not all_menu_items or not tables or not users:
            await db.commit()
            return stats
        
        # ==========================================
        # 3. Simulate 50 Past Orders
        # ==========================================
        for i in range(50):
            # Random date in last 30 days
            days_ago = random.randint(1, 30)
            hours_ago = random.randint(1, 12)
            order_date = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)
            
            table = random.choice(tables)
            waiter = random.choice(users)
            
            # Random number of items (1-5)
            num_items = random.randint(1, 5)
            selected_items = random.sample(all_menu_items, min(num_items, len(all_menu_items)))
            
            subtotal = sum(item.price * random.randint(1, 3) for item in selected_items)
            tax = subtotal * 0.16
            total = subtotal + tax
            
            order = Order(
                id=uuid4(),
                tenant_id=tenant.id,
                table_id=table.id,
                waiter_id=waiter.id,
                status=OrderStatus.PAID,
                order_source=random.choice([OrderSource.POS, OrderSource.SELF_SERVICE]),
                service_type=ServiceType.DINE_IN,
                subtotal=subtotal,
                tax=tax,
                total=total,
                created_at=order_date,
                updated_at=order_date
            )
            db.add(order)
            await db.flush()
            stats["orders"] += 1
            
            # Create order items
            for menu_item in selected_items:
                quantity = random.randint(1, 3)
                order_item = OrderItem(
                    id=uuid4(),
                    order_id=order.id,
                    menu_item_id=menu_item.id,
                    menu_item_name=menu_item.name,
                    route_to=menu_item.route_to,
                    quantity=quantity,
                    unit_price=menu_item.price,
                    status=OrderItemStatus.SERVED,
                    created_at=order_date
                )
                db.add(order_item)
                stats["order_items"] += 1
        
        # ==========================================
        # 4. Add More Ingredients
        # ==========================================
        additional_ingredients = [
            ("Aguacate Hass", UnitOfMeasure.KG, 15.0, 3.0, 85.00),
            ("Crema Ácida", UnitOfMeasure.LT, 10.0, 2.0, 55.00),
            ("Chile Poblano", UnitOfMeasure.KG, 8.0, 2.0, 45.00),
            ("Queso Panela", UnitOfMeasure.KG, 5.0, 1.0, 95.00),
            ("Cilantro", UnitOfMeasure.KG, 3.0, 0.5, 35.00),
            ("Limón", UnitOfMeasure.KG, 10.0, 2.0, 25.00),
            ("Cerveza Artesanal", UnitOfMeasure.PZA, 48.0, 12.0, 35.00),
            ("Tequila Blanco", UnitOfMeasure.LT, 5.0, 1.0, 280.00),
        ]
        
        for ing_name, unit, stock, min_stock, cost in additional_ingredients:
            existing = await db.execute(
                select(Ingredient).where(
                    Ingredient.tenant_id == tenant.id,
                    Ingredient.name == ing_name
                )
            )
            if existing.scalar_one_or_none():
                continue
            
            ingredient = Ingredient(
                id=uuid4(),
                tenant_id=tenant.id,
                name=ing_name,
                sku=f"ING-{str(uuid4())[:8].upper()}",
                unit=unit,
                stock_quantity=stock,
                min_stock_alert=min_stock,
                cost_per_unit=cost,
                is_active=True
            )
            db.add(ingredient)
            stats["ingredients"] += 1
        
        await db.commit()
        return stats


@app.command("seed-demo-data")
def seed_demo_data(
    tenant_id: str = typer.Argument(..., help="Tenant UUID to seed with demo data"),
):
    """
    🎭 Seed realistic demo data for presentations and testing.
    
    Creates:
    - 5 employees (2 waiters, 2 kitchen, 1 cashier)
    - Complete menu with 20 authentic Mexican dishes
    - 50 past orders (for analytics charts)
    - Additional inventory items
    
    Example:
        python cli.py seed-demo-data a1b2c3d4-e5f6-7890-abcd-ef1234567890
    """
    console.print(Panel.fit(
        f"[bold blue]Seeding demo data for tenant:[/bold blue]\n[cyan]{tenant_id}[/cyan]",
        title="🎭 Demo Seeding"
    ))
    
    with console.status("[bold green]Creating realistic demo data..."):
        try:
            stats = asyncio.run(_seed_demo_data_async(tenant_id))
            
            console.print("\n[bold green]✅ Demo data seeded successfully![/bold green]\n")
            
            # Display results
            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Entity", style="cyan")
            table.add_column("Created", style="white")
            
            table.add_row("👥 Employees", str(stats["employees"]))
            table.add_row("📂 Categories", str(stats["categories"]))
            table.add_row("🍽️ Menu Items", str(stats["menu_items"]))
            table.add_row("📋 Orders", str(stats["orders"]))
            table.add_row("📦 Order Items", str(stats["order_items"]))
            table.add_row("🥬 Ingredients", str(stats["ingredients"]))
            
            console.print(table)
            
            console.print("\n[yellow]📊 Your analytics dashboard now has data![/yellow]")
            console.print("[dim]The demo data includes orders from the last 30 days.[/dim]")
            
        except ValueError as e:
            console.print(f"\n[red]❌ Error: {str(e)}[/red]")
            raise typer.Exit(1)
        except Exception as e:
            console.print(f"\n[red]❌ Error seeding data: {str(e)}[/red]")
            raise typer.Exit(1)


# ============================================
# Entry Point
# ============================================

if __name__ == "__main__":
    app()

