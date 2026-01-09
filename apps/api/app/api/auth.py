"""
RestoNext MX - Authentication API Routes
Login, registration, and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
