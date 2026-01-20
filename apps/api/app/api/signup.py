"""
RestoNext MX - Checkout Signup API
===================================
Handles new customer registration with Stripe checkout integration.

Flow:
1. Create tenant and user in DB
2. Create Stripe customer
3. Create Stripe checkout session
4. Return checkout URL for redirect

After payment:
- Stripe webhook activates the subscription
- User receives welcome email with credentials
"""

import os
import secrets
import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.models import Tenant, User, UserRole

# Initialize logger
logger = logging.getLogger(__name__)

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Plan to Price ID mapping
STRIPE_PRICE_IDS = {
    "starter": {
        "monthly": os.getenv("STRIPE_PRICE_ID_STARTER_MONTHLY", "price_starter_monthly"),
        "annual": os.getenv("STRIPE_PRICE_ID_STARTER_ANNUAL", "price_starter_annual"),
    },
    "professional": {
        "monthly": os.getenv("STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY", "price_professional_monthly"),
        "annual": os.getenv("STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL", "price_professional_annual"),
    },
    "enterprise": {
        "monthly": os.getenv("STRIPE_PRICE_ID_ENTERPRISE_MONTHLY", "price_enterprise_monthly"),
        "annual": os.getenv("STRIPE_PRICE_ID_ENTERPRISE_ANNUAL", "price_enterprise_annual"),
    },
}

# Plan features configuration
PLAN_ADDONS = {
    "starter": {
        "self_service": False,
        "kds_pro": False,
        "analytics_ai": False,
        "multi_branch": False,
        "inventory": True,
        "catering": False,
        "loyalty": False,
    },
    "professional": {
        "self_service": True,
        "kds_pro": True,
        "analytics_ai": False,
        "multi_branch": False,
        "inventory": True,
        "catering": True,
        "loyalty": True,
    },
    "enterprise": {
        "self_service": True,
        "kds_pro": True,
        "analytics_ai": True,
        "multi_branch": True,
        "inventory": True,
        "catering": True,
        "loyalty": True,
        "admin_access": True,
    },
}

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================
# Request/Response Models
# ============================================

class SignupCheckoutRequest(BaseModel):
    """Request to create account and checkout session."""
    restaurant_name: str
    email: EmailStr
    password: str
    rfc: Optional[str] = None
    plan: str = "starter"
    billing_cycle: str = "annual"  # monthly or annual


class SignupCheckoutResponse(BaseModel):
    """Response with checkout URL."""
    access_token: str
    token_type: str = "bearer"
    checkout_session_url: Optional[str] = None
    tenant_id: str
    user_id: str


# ============================================
# Helper Functions
# ============================================

def generate_slug(name: str) -> str:
    """Generate URL-safe slug from name."""
    import re
    # Remove special characters, lowercase, replace spaces with dashes
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    # Add random suffix for uniqueness
    suffix = secrets.token_hex(3)
    return f"{slug}-{suffix}"


async def check_email_exists(email: str, db: AsyncSession) -> bool:
    """Check if email already exists in database."""
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none() is not None


# ============================================
# Signup Checkout Endpoint
# ============================================

@router.post(
    "/signup-checkout",
    response_model=SignupCheckoutResponse,
    summary="Create Account and Checkout Session",
    description="Register new tenant and user, then create Stripe checkout session."
)
async def signup_checkout(
    request: SignupCheckoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete signup flow with Stripe checkout.
    
    Steps:
    1. Validate email is not taken
    2. Create Tenant
    3. Create User (admin)
    4. Create Stripe Customer
    5. Create Stripe Checkout Session
    6. Return access token and checkout URL
    """
    
    # Validate plan
    if request.plan not in STRIPE_PRICE_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")
    
    if request.billing_cycle not in ["monthly", "annual"]:
        raise HTTPException(status_code=400, detail="billing_cycle must be 'monthly' or 'annual'")
    
    # Check if email exists
    if await check_email_exists(request.email, db):
        raise HTTPException(
            status_code=400,
            detail="Este email ya está registrado. ¿Quieres iniciar sesión?"
        )
    
    try:
        # ============================================
        # Step 1: Create Tenant
        # ============================================
        slug = generate_slug(request.restaurant_name)
        
        # Get initial addons based on plan (trial mode - all enabled)
        initial_addons = PLAN_ADDONS.get(request.plan, PLAN_ADDONS["starter"]).copy()
        
        tenant = Tenant(
            name=request.restaurant_name,
            slug=slug,
            rfc=request.rfc.upper() if request.rfc else None,
            contacts={"email": request.email},
            active_addons=initial_addons,
            billing_config={
                "pending_plan": request.plan,
                "billing_cycle": request.billing_cycle,
                "subscription_status": "trialing",
                "trial_started_at": datetime.utcnow().isoformat(),
            },
            onboarding_step="checkout",
            onboarding_complete=False,
        )
        db.add(tenant)
        await db.flush()  # Get tenant ID without committing
        
        logger.info(f"Created tenant {tenant.id} for {request.restaurant_name}")
        
        # ============================================
        # Step 2: Create Admin User
        # ============================================
        hashed_password = get_password_hash(request.password)
        
        user = User(
            tenant_id=tenant.id,
            email=request.email,
            hashed_password=hashed_password,
            name="Administrador",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        
        logger.info(f"Created admin user {user.id} for tenant {tenant.id}")
        
        # ============================================
        # Step 3: Create Stripe Customer
        # ============================================
        checkout_session_url = None
        
        if stripe.api_key:
            try:
                # Create Stripe customer
                customer = stripe.customers.create(
                    name=request.restaurant_name,
                    email=request.email,
                    metadata={
                        "tenant_id": str(tenant.id),
                        "user_id": str(user.id),
                        "slug": slug,
                        "plan": request.plan,
                    },
                )
                
                # Update tenant with Stripe customer ID
                tenant.billing_config["stripe_customer_id"] = customer.id
                
                logger.info(f"Created Stripe customer {customer.id}")
                
                # ============================================
                # Step 4: Create Checkout Session
                # ============================================
                price_id = STRIPE_PRICE_IDS[request.plan][request.billing_cycle]
                
                checkout_session = stripe.checkout.Session.create(
                    customer=customer.id,
                    payment_method_types=["card"],
                    line_items=[{
                        "price": price_id,
                        "quantity": 1,
                    }],
                    mode="subscription",
                    success_url=f"{FRONTEND_URL}/onboarding?session_id={{CHECKOUT_SESSION_ID}}&success=true",
                    cancel_url=f"{FRONTEND_URL}/checkout?plan={request.plan}&canceled=true",
                    subscription_data={
                        "trial_period_days": 14,
                        "metadata": {
                            "tenant_id": str(tenant.id),
                            "user_id": str(user.id),
                            "plan": request.plan,
                        },
                    },
                    metadata={
                        "tenant_id": str(tenant.id),
                        "user_id": str(user.id),
                        "plan": request.plan,
                        "signup_flow": "true",
                    },
                    allow_promotion_codes=True,
                    billing_address_collection="required",
                    tax_id_collection={"enabled": True},  # For Mexican RFC
                    locale="es-419",  # Spanish (Latin America)
                )
                
                checkout_session_url = checkout_session.url
                tenant.billing_config["checkout_session_id"] = checkout_session.id
                
                logger.info(f"Created checkout session {checkout_session.id}")
                
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error: {e}")
                # Continue without Stripe - allow trial signup
                tenant.billing_config["stripe_error"] = str(e)
        else:
            logger.warning("Stripe API key not configured, proceeding without payment")
        
        # ============================================
        # Step 5: Commit and Generate Token
        # ============================================
        await db.commit()
        
        # Generate access token for immediate login
        token_obj = create_access_token(
            user_id=str(user.id),
            tenant_id=str(tenant.id),
            role=user.role.value,
        )
        access_token = token_obj.access_token
        
        return SignupCheckoutResponse(
            access_token=access_token,
            checkout_session_url=checkout_session_url,
            tenant_id=str(tenant.id),
            user_id=str(user.id),
        )
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Signup error: {e}\n{error_trace}")
        
        # DEBUG: Exposing raw error to client for debugging purposes
        raise HTTPException(
            status_code=500,
            detail=f"DEBUG ERROR: {type(e).__name__}: {str(e)}"
        )
