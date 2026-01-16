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
    # Build query based on whether tenant_id is provided
    if credentials.tenant_id:
        query = select(User).where(
            and_(
                User.pin_hash == get_password_hash(credentials.pin),
                User.tenant_id == credentials.tenant_id,
                User.is_active == True
            )
        )
    else:
        # If no tenant_id, search by PIN only (works for single-tenant setups)
        query = select(User).where(
            and_(
                User.pin_hash == get_password_hash(credentials.pin),
                User.is_active == True
            )
        )
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    # For security, if multiple users have same PIN (unlikely), require tenant_id
    if len(users) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple users found. Please provide tenant_id.",
        )
    
    if len(users) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )
    
    user = users[0]
    
    # Generate token
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    
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
        }
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
    
    return {
        "access_token": token.access_token,
        "token_type": token.token_type,
        "expires_in": token.expires_in,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user info"""
    return current_user


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
