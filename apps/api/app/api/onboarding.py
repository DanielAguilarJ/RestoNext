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
