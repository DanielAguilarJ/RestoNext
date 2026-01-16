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
        "addons": {"self_service": False, "delivery": False, "kds_pro": False, "analytics_ai": False},
        "features": {}
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
# Entry Point
# ============================================

if __name__ == "__main__":
    app()
