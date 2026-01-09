"""
RestoNext MX - JWT Authentication & Security
Role-based access control for restaurant staff
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import User, UserRole

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
security = HTTPBearer()


class TokenData(BaseModel):
    """JWT token payload"""
    user_id: str
    tenant_id: str
    role: str
    exp: datetime


class Token(BaseModel):
    """Token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(user_id: str, tenant_id: str, role: str) -> Token:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
    }
    
    encoded_jwt = jwt.encode(
        payload, 
        settings.jwt_secret, 
        algorithm=settings.jwt_algorithm
    )
    
    return Token(
        access_token=encoded_jwt,
        expires_in=settings.jwt_expire_minutes * 60,
    )


def decode_token(token: str) -> TokenData:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        return TokenData(
            user_id=payload["sub"],
            tenant_id=payload["tenant_id"],
            role=payload["role"],
            exp=datetime.fromtimestamp(payload["exp"]),
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user from token"""
    token_data = decode_token(credentials.credentials)
    
    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


def require_roles(*allowed_roles: UserRole):
    """
    Dependency to check if user has required role.
    
    Usage:
        @router.get("/admin-only")
        async def admin_route(user: User = Depends(require_roles(UserRole.ADMIN))):
            ...
    """
    async def role_checker(
        user: User = Depends(get_current_user),
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in allowed_roles]}",
            )
        return user
    
    return role_checker


# Pre-defined role dependencies for convenience
require_admin = require_roles(UserRole.ADMIN)
require_manager_or_admin = require_roles(UserRole.ADMIN, UserRole.MANAGER)
require_waiter = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
require_kitchen = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN)
require_cashier = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
