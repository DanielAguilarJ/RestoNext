"""
RestoNext MX - Onboarding API Routes
Multi-tenant onboarding flow for restaurant profile setup
"""

import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Tenant
from app.schemas.schemas import (
    TenantOnboardingStart,
    TenantOnboardingUpdate,
    TenantPublic,
)

router = APIRouter(tags=["Onboarding"])


# ============================================
# Validation helpers
# ============================================

RFC_PATTERN = re.compile(r'^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$')

def validate_rfc(rfc: str) -> bool:
    """Validate Mexican RFC format"""
    return bool(RFC_PATTERN.match(rfc.upper()))


def validate_onboarding_complete(tenant: Tenant) -> List[str]:
    """
    Validate that all required fields are filled for onboarding completion.
    Returns a list of missing fields.
    """
    errors = []
    
    # Required fields for completion
    if not tenant.trade_name or len(tenant.trade_name) < 2:
        errors.append("trade_name is required (min 2 characters)")
    
    if not tenant.legal_name or len(tenant.legal_name) < 2:
        errors.append("legal_name (razón social) is required")
    
    if not tenant.rfc:
        errors.append("rfc is required")
    elif not validate_rfc(tenant.rfc):
        errors.append("rfc format is invalid")
    
    if not tenant.regimen_fiscal:
        errors.append("regimen_fiscal is required")
    
    # Fiscal address validation
    fiscal_addr = tenant.fiscal_address or {}
    if not fiscal_addr.get("street"):
        errors.append("fiscal_address.street is required")
    if not fiscal_addr.get("postal_code") or len(str(fiscal_addr.get("postal_code", ""))) != 5:
        errors.append("fiscal_address.postal_code is required (5 digits)")
    if not fiscal_addr.get("city"):
        errors.append("fiscal_address.city is required")
    if not fiscal_addr.get("state"):
        errors.append("fiscal_address.state is required")
    
    # Contacts validation
    contacts = tenant.contacts or {}
    if not contacts.get("email"):
        errors.append("contacts.email is required")
    
    return errors


# ============================================
# Endpoints
# ============================================

@router.post("/onboarding/start", response_model=TenantPublic)
async def start_onboarding(
    data: TenantOnboardingStart,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initialize tenant profile with basic info (Step 1).
    
    This updates the tenant associated with the current user.
    """
    # Get user's tenant
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update with initial data
    tenant.trade_name = data.trade_name
    if data.logo_url:
        tenant.logo_url = data.logo_url
    tenant.onboarding_step = "contacts"
    
    await db.commit()
    await db.refresh(tenant)
    
    return tenant


@router.patch("/onboarding/profile", response_model=TenantPublic)
async def update_onboarding_profile(
    data: TenantOnboardingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update tenant profile during onboarding (any step).
    
    Only provided fields are updated (partial update).
    """
    # Get user's tenant
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "fiscal_address" and value:
            tenant.fiscal_address = value if isinstance(value, dict) else value.model_dump()
        elif field == "contacts" and value:
            tenant.contacts = value if isinstance(value, dict) else value.model_dump()
        elif field == "ticket_config" and value:
            tenant.ticket_config = value if isinstance(value, dict) else value.model_dump()
        elif field == "billing_config" and value:
            tenant.billing_config = value if isinstance(value, dict) else value.model_dump()
        elif hasattr(tenant, field):
            setattr(tenant, field, value)
    
    await db.commit()
    await db.refresh(tenant)
    
    return tenant


@router.post("/onboarding/complete", response_model=TenantPublic)
async def complete_onboarding(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate and complete the onboarding process.
    
    Validates all required fields are filled before marking complete.
    After this, the user can access POS/KDS/Billing features.
    """
    # Get user's tenant
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    if tenant.onboarding_complete:
        return tenant  # Already complete
    
    # Validate all required fields
    errors = validate_onboarding_complete(tenant)
    
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Onboarding validation failed",
                "errors": errors,
            }
        )
    
    # Mark as complete
    tenant.onboarding_complete = True
    tenant.onboarding_step = "complete"
    
    # Also sync to legacy fiscal_config for backward compatibility
    tenant.fiscal_config = {
        "rfc": tenant.rfc,
        "razon_social": tenant.legal_name,
        "regimen_fiscal": tenant.regimen_fiscal,
        "codigo_postal": tenant.fiscal_address.get("postal_code", ""),
        "pac_provider": tenant.billing_config.get("pac_provider"),
        "csd_certificate_path": tenant.billing_config.get("csd_cert_path"),
        "csd_key_path": tenant.billing_config.get("csd_key_path"),
    }
    
    await db.commit()
    await db.refresh(tenant)
    
    return tenant


@router.get("/tenant/me", response_model=TenantPublic)
async def get_current_tenant_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's tenant profile.
    
    Used by the frontend to load tenant context and show profile in UI.
    """
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant


# ============================================
# Quick Onboarding Wizard Endpoints
# ============================================

from pydantic import BaseModel
from typing import Optional


class QuickOnboardingRequest(BaseModel):
    """Request for quick onboarding wizard completion."""
    name: str
    logo_url: Optional[str] = None
    currency: str = "MXN"
    service_types: List[str] = ["dine_in"]
    seed_demo_data: bool = False


class QuickOnboardingResponse(BaseModel):
    """Response from quick onboarding."""
    success: bool
    message: str
    tenant_name: str
    demo_data_seeded: bool


@router.post("/onboarding/quick-complete", response_model=QuickOnboardingResponse)
async def quick_complete_onboarding(
    data: QuickOnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Quick-complete the onboarding wizard.
    
    This is a simplified onboarding for new users that:
    1. Updates the tenant name and logo
    2. Sets currency and service preferences
    3. Optionally seeds demo data
    4. Marks onboarding as complete
    
    Used by the OnboardingWizard component.
    """
    # Get user's tenant
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update tenant with wizard data
    tenant.trade_name = data.name
    tenant.name = data.name  # Also update the main name field
    
    if data.logo_url:
        tenant.logo_url = data.logo_url
    
    # Update config with service preferences
    current_config = tenant.config or {}
    current_config["currency"] = data.currency
    current_config["service_types"] = data.service_types
    tenant.config = current_config
    
    # Mark onboarding as complete for wizard flow
    tenant.onboarding_step = "complete"
    # Note: onboarding_complete stays False until fiscal info is filled
    
    await db.commit()
    
    demo_seeded = False
    
    # Optionally seed demo data
    if data.seed_demo_data:
        try:
            await _seed_demo_data_for_tenant(db, tenant.id)
            demo_seeded = True
        except Exception as e:
            print(f"Warning: Failed to seed demo data: {e}")
    
    await db.refresh(tenant)
    
    return QuickOnboardingResponse(
        success=True,
        message="Onboarding completado exitosamente",
        tenant_name=tenant.trade_name or tenant.name,
        demo_data_seeded=demo_seeded
    )


async def _seed_demo_data_for_tenant(db: AsyncSession, tenant_id):
    """
    Seed basic demo data for a new tenant.
    
    Creates:
    - Sample menu categories
    - Sample products
    - Sample tables
    """
    import uuid
    from app.models.models import MenuCategory, MenuItem, Table
    
    # Create demo categories
    categories_data = [
        {"name": "Entradas", "display_order": 1, "color": "#10B981"},
        {"name": "Platos Fuertes", "display_order": 2, "color": "#3B82F6"},
        {"name": "Bebidas", "display_order": 3, "color": "#8B5CF6"},
        {"name": "Postres", "display_order": 4, "color": "#EC4899"},
    ]
    
    category_ids = {}
    for cat_data in categories_data:
        category = MenuCategory(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=cat_data["name"],
            display_order=cat_data["display_order"],
            color=cat_data["color"],
            is_active=True
        )
        db.add(category)
        category_ids[cat_data["name"]] = category.id
    
    await db.flush()
    
    # Create demo products
    products_data = [
        {"name": "Nachos con Guacamole", "price": 95.00, "category": "Entradas", "station": "kitchen"},
        {"name": "Tacos al Pastor (3 pzas)", "price": 85.00, "category": "Platos Fuertes", "station": "kitchen"},
        {"name": "Enchiladas Suizas", "price": 145.00, "category": "Platos Fuertes", "station": "kitchen"},
        {"name": "Cerveza Artesanal", "price": 75.00, "category": "Bebidas", "station": "bar"},
        {"name": "Margarita Clásica", "price": 120.00, "category": "Bebidas", "station": "bar"},
        {"name": "Agua Fresca del Día", "price": 35.00, "category": "Bebidas", "station": "bar"},
        {"name": "Flan Napolitano", "price": 65.00, "category": "Postres", "station": "kitchen"},
    ]
    
    for prod_data in products_data:
        product = MenuItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            category_id=category_ids.get(prod_data["category"]),
            name=prod_data["name"],
            price=prod_data["price"],
            station=prod_data["station"],
            is_available=True
        )
        db.add(product)
    
    # Create demo tables
    for i in range(1, 6):
        table = Table(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            number=i,
            capacity=4,
            zone=f"Zona {chr(64 + ((i-1) // 2) + 1)}",  # A, A, B, B, C
            status="available",
            is_active=True
        )
        db.add(table)
    
    await db.commit()


@router.get("/onboarding/status")
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current onboarding status for the tenant.
    
    Used by the frontend to decide if the onboarding wizard should be shown.
    """
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Determine if wizard should be shown
    # Show wizard if onboarding_step is "basic" (initial state)
    show_wizard = tenant.onboarding_step == "basic" and not tenant.onboarding_complete
    
    return {
        "show_wizard": show_wizard,
        "onboarding_step": tenant.onboarding_step,
        "onboarding_complete": tenant.onboarding_complete,
        "tenant_name": tenant.trade_name or tenant.name,
        "has_logo": bool(tenant.logo_url),
    }
