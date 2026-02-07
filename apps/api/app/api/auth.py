"""
RestoNext MX - Authentication API Routes
Login, registration, and user management

Includes:
- Email/password login
- PIN-based fast login for POS
- User management
- Tenant registration
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_user, 
    verify_password, 
    get_password_hash,
    create_access_token,
    require_admin,
)
from app.models.models import User, Tenant, UserRole
from app.schemas.schemas import (
    LoginRequest, UserCreate, UserResponse, Token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================
# PIN Login Schemas
# ============================================

class PinLoginRequest(BaseModel):
    """Request body for PIN-based authentication"""
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")
    tenant_id: Optional[UUID] = None  # Optional if only one tenant


class PinSetupRequest(BaseModel):
    """Request body for setting up a PIN"""
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")


# ============================================
# PIN Authentication Endpoints
# ============================================

@router.post("/pin-login")
async def pin_login(
    credentials: PinLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with PIN for fast POS access.
    
    PIN login is designed for speed:
    - 4-6 digit numeric PIN
    - Optional tenant_id (required for multi-tenant setups)
    - Returns JWT token same as regular login
    
    PIN must be set up first using /auth/setup-pin endpoint.
    """
    # Build query — get users who HAVE a pin_hash set
    if credentials.tenant_id:
        query = select(User).where(
            and_(
                User.pin_hash.isnot(None),
                User.tenant_id == credentials.tenant_id,
                User.is_active == True
            )
        )
    else:
        # If no tenant_id, search all active users with PINs
        query = select(User).where(
            and_(
                User.pin_hash.isnot(None),
                User.is_active == True
            )
        )
    
    result = await db.execute(query)
    candidates = result.scalars().all()
    
    # Verify PIN against each candidate using bcrypt verify (not hash comparison)
    matched_users = [u for u in candidates if verify_password(credentials.pin, u.pin_hash)]
    
    if len(matched_users) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple users found. Please provide tenant_id.",
        )
    
    if len(matched_users) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )
    
    user = matched_users[0]
    
    # Generate token
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    
    # Load tenant for addon info
    tenant = await db.get(Tenant, user.tenant_id)
    active_addons = (tenant.active_addons or {}) if tenant else {}
    
    return {
        "success": True,
        "access_token": token.access_token,
        "token_type": token.token_type,
        "expires_in": token.expires_in,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
        },
        "active_addons": active_addons,
    }


@router.post("/setup-pin")
async def setup_pin(
    pin_data: PinSetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set up or update PIN for the current user.
    
    Requires authenticated user (email/password login first).
    PIN must be 4-6 digits.
    """
    # Hash and store the PIN
    current_user.pin_hash = get_password_hash(pin_data.pin)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "PIN configured successfully"
    }


@router.delete("/remove-pin")
async def remove_pin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove PIN for the current user.
    """
    current_user.pin_hash = None
    
    await db.commit()
    
    return {
        "success": True,
        "message": "PIN removed successfully"
    }


@router.post("/login")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user and return JWT token.
    
    Token contains:
    - user_id
    - tenant_id
    - role
    """
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    
    # Load tenant for addon info
    tenant = await db.get(Tenant, user.tenant_id)
    active_addons = (tenant.active_addons or {}) if tenant else {}
    
    return {
        "access_token": token.access_token,
        "token_type": token.token_type,
        "expires_in": token.expires_in,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
        },
        "active_addons": active_addons,
    }
async def logout():
    """Logout endpoint — client should clear tokens."""
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user info with tenant data for license checks."""
    tenant = await db.get(Tenant, current_user.tenant_id)
    tenant_data = None
    if tenant:
        tenant_data = {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "trade_name": tenant.trade_name,
            "logo_url": tenant.logo_url,
            "active_addons": tenant.active_addons or {},
            "features_config": tenant.features_config or {},
            "billing_config": tenant.billing_config or {},
            "currency": tenant.currency,
            "timezone": tenant.timezone,
            "onboarding_complete": tenant.onboarding_complete,
        }
    return {
        "id": str(current_user.id),
        "tenant_id": str(current_user.tenant_id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "tenant": tenant_data,
    }


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create a new user (admin only).
    
    New user will be assigned to same tenant as admin.
    """
    # Check if email exists
    existing = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        tenant_id=current_user.tenant_id,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name,
        role=UserRole(user_data.role),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/register-tenant")
async def register_tenant(
    tenant_name: str,
    tenant_slug: str,
    admin_email: str,
    admin_password: str,
    admin_name: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new restaurant tenant with admin user.
    
    This is typically called during onboarding.
    """
    # Check if slug exists
    existing = await db.execute(
        select(Tenant).where(Tenant.slug == tenant_slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Tenant slug already exists"
        )
    
    # Check if email exists
    existing_user = await db.execute(
        select(User).where(User.email == admin_email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create tenant with empty fiscal config (to be filled later)
    tenant = Tenant(
        name=tenant_name,
        slug=tenant_slug,
        fiscal_config={},
    )
    db.add(tenant)
    await db.flush()
    
    # Create admin user
    admin = User(
        tenant_id=tenant.id,
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        name=admin_name,
        role=UserRole.ADMIN,
    )
    db.add(admin)
    await db.commit()
    
    # Generate token
    token = create_access_token(
        user_id=str(admin.id),
        tenant_id=str(tenant.id),
        role=admin.role.value,
    )
    
    return {
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
        },
        "user": {
            "id": str(admin.id),
            "name": admin.name,
            "email": admin.email,
            "role": admin.role.value,
        },
        "access_token": token.access_token,
        "token_type": token.token_type,
    }
