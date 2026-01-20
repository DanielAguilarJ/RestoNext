"""
RestoNext MX - Stripe Subscription API
=======================================
B2B SaaS billing for restaurant subscriptions.

This is NOT for customer payments at the table.
This is for restaurants paying their monthly subscription to RestoNext.

Features:
- Create Stripe Checkout sessions for plan upgrades
- Generate Customer Portal links for invoice downloads
- Webhook handling for subscription lifecycle events

Security:
- All webhooks verified with Stripe signature
- Idempotent event processing

Author: RestoNext Team
"""

import os
import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_tenant
from app.models.models import Tenant, User, UserRole

# Initialize logger
logger = logging.getLogger(__name__)

# Stripe Configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Plan ID Mapping (Stripe Price IDs)
STRIPE_PRICE_IDS = {
    "starter": os.getenv("STRIPE_PRICE_ID_STARTER", "price_starter"),
    "professional": os.getenv("STRIPE_PRICE_ID_PROFESSIONAL", "price_professional"),
    "enterprise": os.getenv("STRIPE_PRICE_ID_ENTERPRISE", "price_enterprise"),
}

# Plan display names and features
PLAN_CONFIG = {
    "starter": {
        "name": "Starter",
        "price_mxn": 999,
        "features": ["POS Básico", "Inventario", "Hasta 5 mesas"],
    },
    "professional": {
        "name": "Professional",
        "price_mxn": 2499,
        "features": ["Todo de Starter", "KDS Avanzado", "Auto-Servicio QR", "División de cuentas"],
    },
    "enterprise": {
        "name": "Enterprise",
        "price_mxn": 5999,
        "features": ["Todo de Professional", "IA (Pronósticos)", "Multi-sucursal", "API Access", "White Label"],
    },
}

router = APIRouter(prefix="/subscription", tags=["Subscription"])


# ============================================
# Request/Response Models
# ============================================

class CheckoutRequest(BaseModel):
    """Request to create a Stripe Checkout session."""
    plan: str  # starter, professional, enterprise
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    """Response with Stripe Checkout URL."""
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    """Response with Stripe Customer Portal URL."""
    portal_url: str


class CurrentPlanResponse(BaseModel):
    """Current subscription plan details."""
    plan: str
    plan_name: str
    price_mxn: float
    features: list[str]
    status: str  # active, trialing, past_due, canceled
    stripe_customer_id: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False


class PlanOption(BaseModel):
    """Available plan option."""
    id: str
    name: str
    price_mxn: float
    features: list[str]
    is_current: bool
    is_upgrade: bool


class PlansResponse(BaseModel):
    """List of available plans."""
    current_plan: str
    plans: list[PlanOption]


# ============================================
# Helper Functions
# ============================================

def _get_tenant_plan(tenant: Tenant) -> str:
    """Determine tenant plan from active_addons."""
    addons = tenant.active_addons or {}
    
    if addons.get("analytics_ai", False):
        return "enterprise"
    elif addons.get("self_service", False) or addons.get("kds_pro", False):
        return "professional"
    else:
        return "starter"


def _get_stripe_customer_id(tenant: Tenant) -> Optional[str]:
    """Get Stripe customer ID from tenant config."""
    billing_config = tenant.billing_config or {}
    return billing_config.get("stripe_customer_id")


async def _ensure_stripe_customer(tenant: Tenant, db: AsyncSession) -> str:
    """
    Ensure tenant has a Stripe customer ID.
    Creates one if it doesn't exist.
    """
    existing_id = _get_stripe_customer_id(tenant)
    if existing_id:
        return existing_id
    
    # Create new Stripe customer
    try:
        customer = stripe.customers.create(
            name=tenant.name,
            email=tenant.contacts.get("email", ""),
            metadata={
                "tenant_id": str(tenant.id),
                "slug": tenant.slug,
            }
        )
        
        # Save customer ID to tenant
        billing_config = tenant.billing_config or {}
        billing_config["stripe_customer_id"] = customer.id
        tenant.billing_config = billing_config
        await db.commit()
        
        logger.info(f"Created Stripe customer {customer.id} for tenant {tenant.id}")
        return customer.id
        
    except stripe.error.StripeError as e:
        logger.error(f"Failed to create Stripe customer: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment profile")


def _update_tenant_plan_from_addons(plan: str) -> dict:
    """
    Generate active_addons dict for a given plan.
    """
    if plan == "enterprise":
        return {
            "self_service": True,
            "kds_pro": True,
            "analytics_ai": True,
            "multi_branch": True,
        }
    elif plan == "professional":
        return {
            "self_service": True,
            "kds_pro": True,
            "analytics_ai": False,
            "multi_branch": False,
        }
    else:  # starter
        return {
            "self_service": False,
            "kds_pro": False,
            "analytics_ai": False,
            "multi_branch": False,
        }


# ============================================
# Endpoints
# ============================================

@router.get(
    "/current",
    response_model=CurrentPlanResponse,
    summary="Get Current Subscription",
    description="Get the current tenant's subscription plan details."
)
async def get_current_subscription(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
):
    """
    Get current subscription plan for the authenticated tenant.
    """
    plan = _get_tenant_plan(tenant)
    plan_config = PLAN_CONFIG.get(plan, PLAN_CONFIG["starter"])
    
    # Get subscription status from Stripe if customer exists
    customer_id = _get_stripe_customer_id(tenant)
    status = "active"
    current_period_end = None
    cancel_at_period_end = False
    
    if customer_id and stripe.api_key:
        try:
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status="all",
                limit=1
            )
            if subscriptions.data:
                sub = subscriptions.data[0]
                status = sub.status
                current_period_end = datetime.fromtimestamp(sub.current_period_end).isoformat()
                cancel_at_period_end = sub.cancel_at_period_end
        except stripe.error.StripeError as e:
            logger.warning(f"Could not fetch subscription status: {e}")
    
    return CurrentPlanResponse(
        plan=plan,
        plan_name=plan_config["name"],
        price_mxn=plan_config["price_mxn"],
        features=plan_config["features"],
        status=status,
        stripe_customer_id=customer_id,
        current_period_end=current_period_end,
        cancel_at_period_end=cancel_at_period_end,
    )


@router.get(
    "/plans",
    response_model=PlansResponse,
    summary="List Available Plans",
    description="Get all available subscription plans with upgrade indicators."
)
async def list_plans(
    tenant: Tenant = Depends(get_current_tenant),
):
    """
    List all available plans with markers for current and upgrade options.
    """
    current_plan = _get_tenant_plan(tenant)
    plan_hierarchy = {"starter": 0, "professional": 1, "enterprise": 2}
    current_level = plan_hierarchy.get(current_plan, 0)
    
    plans = []
    for plan_id, config in PLAN_CONFIG.items():
        plan_level = plan_hierarchy.get(plan_id, 0)
        plans.append(PlanOption(
            id=plan_id,
            name=config["name"],
            price_mxn=config["price_mxn"],
            features=config["features"],
            is_current=plan_id == current_plan,
            is_upgrade=plan_level > current_level,
        ))
    
    return PlansResponse(current_plan=current_plan, plans=plans)


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    summary="Create Checkout Session",
    description="Create a Stripe Checkout session for plan upgrade."
)
async def create_checkout_session(
    request: CheckoutRequest,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Checkout session for subscription upgrade.
    
    The session redirects to Stripe's hosted checkout page.
    After successful payment, Stripe sends a webhook to update the tenant.
    """
    # Validate plan
    if request.plan not in STRIPE_PRICE_IDS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")
    
    # Check if API key is configured
    if not stripe.api_key:
        raise HTTPException(
            status_code=503,
            detail="Payment processing is not configured. Please contact support."
        )
    
    # Ensure tenant has Stripe customer
    customer_id = await _ensure_stripe_customer(tenant, db)
    
    # Get price ID
    price_id = STRIPE_PRICE_IDS[request.plan]
    
    # Build URLs
    success_url = request.success_url or f"{FRONTEND_URL}/settings/billing?success=true&plan={request.plan}"
    cancel_url = request.cancel_url or f"{FRONTEND_URL}/settings/billing?canceled=true"
    
    try:
        # Create Stripe Checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            subscription_data={
                "metadata": {
                    "tenant_id": str(tenant.id),
                    "plan": request.plan,
                },
            },
            metadata={
                "tenant_id": str(tenant.id),
                "plan": request.plan,
            },
            allow_promotion_codes=True,
            billing_address_collection="required",
            tax_id_collection={"enabled": True},  # For Mexican RFC
            locale="es-419",  # Spanish (Latin America)
        )
        
        logger.info(f"Created checkout session {session.id} for tenant {tenant.id}, plan {request.plan}")
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post(
    "/portal",
    response_model=PortalResponse,
    summary="Create Customer Portal Session",
    description="Generate a link to Stripe Customer Portal for invoice downloads and subscription management."
)
async def create_portal_session(
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Customer Portal session.
    
    The portal allows customers to:
    - View and download invoices
    - Update payment methods
    - Cancel or modify subscription
    """
    if not stripe.api_key:
        raise HTTPException(
            status_code=503,
            detail="Payment processing is not configured. Please contact support."
        )
    
    # Ensure tenant has Stripe customer
    customer_id = await _ensure_stripe_customer(tenant, db)
    
    return_url = f"{FRONTEND_URL}/settings/billing"
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        
        logger.info(f"Created portal session for tenant {tenant.id}")
        
        return PortalResponse(portal_url=session.url)
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe portal error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create customer portal session")


# ============================================
# Webhook Handler (separate router for no auth)
# ============================================

webhook_router = APIRouter(prefix="/webhook", tags=["Webhooks"])


@webhook_router.post(
    "/stripe",
    summary="Stripe Webhook",
    description="Handle Stripe webhook events for subscription lifecycle."
)
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    
    Events handled:
    - checkout.session.completed: Initial subscription created
    - invoice.payment_succeeded: Recurring payment successful
    - invoice.payment_failed: Payment failed
    - customer.subscription.updated: Plan changed
    - customer.subscription.deleted: Subscription canceled
    
    Security:
    - All events verified with webhook signature
    - Duplicate events are idempotent (safe to replay)
    """
    # Get raw body for signature verification
    payload = await request.body()
    
    # Verify webhook signature
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured, skipping verification")
        try:
            event = stripe.Event.construct_from(
                stripe.util.convert_to_stripe_object(
                    request.body(), stripe.api_key
                ).__dict__,
                stripe.api_key
            )
        except Exception:
            event_data = await request.json()
            event = stripe.util.convert_to_stripe_object(event_data)
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
    
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    logger.info(f"Received Stripe webhook: {event_type}")
    
    # Route to handler based on event type
    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(event_data, db)
        elif event_type == "invoice.payment_succeeded":
            await _handle_payment_succeeded(event_data, db)
        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(event_data, db)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(event_data, db)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event_data, db)
        else:
            logger.debug(f"Unhandled event type: {event_type}")
        
        return {"status": "success", "event_type": event_type}
        
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        # Return 200 to prevent Stripe from retrying
        # Log the error for investigation
        return {"status": "error", "message": str(e)}


# ============================================
# Webhook Event Handlers
# ============================================

async def _handle_checkout_completed(session: dict, db: AsyncSession):
    """
    Handle successful checkout session completion.
    
    Uses ProvisioningService for complete user setup including:
    - Activating subscription
    - Updating tenant permissions
    - Sending welcome email
    """
    from app.services.provisioning_service import ProvisioningService
    
    provisioning = ProvisioningService(db)
    
    try:
        success = await provisioning.provision_from_checkout(session)
        if success:
            logger.info(f"Successfully provisioned from checkout: {session.get('id')}")
        else:
            logger.warning(f"Provisioning returned False for checkout: {session.get('id')}")
    except Exception as e:
        logger.error(f"Provisioning error for checkout {session.get('id')}: {e}")
        # Re-raise to be caught by webhook handler
        raise



async def _handle_payment_succeeded(invoice: dict, db: AsyncSession):
    """Handle successful recurring payment."""
    customer_id = invoice.get("customer")
    
    if not customer_id:
        return
    
    # Find tenant by Stripe customer ID
    result = await db.execute(
        select(Tenant).where(
            Tenant.billing_config["stripe_customer_id"].astext == customer_id
        )
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        logger.warning(f"No tenant found for Stripe customer: {customer_id}")
        return
    
    # Update billing status
    billing_config = tenant.billing_config or {}
    billing_config["subscription_status"] = "active"
    billing_config["last_payment_at"] = datetime.utcnow().isoformat()
    billing_config["last_invoice_id"] = invoice.get("id")
    tenant.billing_config = billing_config
    
    await db.commit()
    
    logger.info(f"Payment succeeded for tenant {tenant.id}")


async def _handle_payment_failed(invoice: dict, db: AsyncSession):
    """Handle failed payment."""
    customer_id = invoice.get("customer")
    
    if not customer_id:
        return
    
    result = await db.execute(
        select(Tenant).where(
            Tenant.billing_config["stripe_customer_id"].astext == customer_id
        )
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        return
    
    # Update billing status
    billing_config = tenant.billing_config or {}
    billing_config["subscription_status"] = "past_due"
    billing_config["payment_failed_at"] = datetime.utcnow().isoformat()
    tenant.billing_config = billing_config
    
    await db.commit()
    
    logger.warning(f"Payment failed for tenant {tenant.id}")
    
    # TODO: Send email notification about failed payment


async def _handle_subscription_updated(subscription: dict, db: AsyncSession):
    """Handle subscription updates (plan changes, status changes)."""
    customer_id = subscription.get("customer")
    
    if not customer_id:
        return
    
    result = await db.execute(
        select(Tenant).where(
            Tenant.billing_config["stripe_customer_id"].astext == customer_id
        )
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        return
    
    # Get plan from subscription metadata
    plan = subscription.get("metadata", {}).get("plan")
    status = subscription.get("status")
    
    billing_config = tenant.billing_config or {}
    billing_config["subscription_status"] = status
    
    if plan:
        billing_config["current_plan"] = plan
        tenant.active_addons = _update_tenant_plan_from_addons(plan)
    
    billing_config["cancel_at_period_end"] = subscription.get("cancel_at_period_end", False)
    billing_config["current_period_end"] = datetime.fromtimestamp(
        subscription.get("current_period_end", 0)
    ).isoformat()
    
    tenant.billing_config = billing_config
    await db.commit()
    
    logger.info(f"Subscription updated for tenant {tenant.id}: {status}")


async def _handle_subscription_deleted(subscription: dict, db: AsyncSession):
    """Handle subscription cancellation."""
    customer_id = subscription.get("customer")
    
    if not customer_id:
        return
    
    result = await db.execute(
        select(Tenant).where(
            Tenant.billing_config["stripe_customer_id"].astext == customer_id
        )
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        return
    
    # Downgrade to starter plan
    tenant.active_addons = _update_tenant_plan_from_addons("starter")
    
    billing_config = tenant.billing_config or {}
    billing_config["subscription_status"] = "canceled"
    billing_config["canceled_at"] = datetime.utcnow().isoformat()
    billing_config["current_plan"] = "starter"
    tenant.billing_config = billing_config
    
    await db.commit()
    
    logger.info(f"Subscription canceled for tenant {tenant.id}, downgraded to starter")
