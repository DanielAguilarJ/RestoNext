"""
RestoNext MX - User Provisioning Service
=========================================
Handles automatic user provisioning after successful payment.

Features:
- Activate user subscriptions
- Send welcome emails with credentials
- Handle idempotent webhook processing
- Log all provisioning events

Author: RestoNext Team
"""

import os
import secrets
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Tenant, User, UserRole
from app.services.email_service import EmailService

# Initialize logger
logger = logging.getLogger(__name__)

# Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class ProvisioningService:
    """
    Service for handling user/tenant provisioning after payment.
    
    This service is called by Stripe webhooks to:
    1. Activate subscriptions
    2. Update tenant permissions
    3. Send welcome emails
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
    
    async def provision_from_checkout(
        self,
        checkout_session: Dict[str, Any],
    ) -> bool:
        """
        Provision user from Stripe checkout.session.completed event.
        
        Args:
            checkout_session: Stripe checkout session object
            
        Returns:
            True if provisioning was successful
        """
        # Extract metadata
        metadata = checkout_session.get("metadata", {})
        tenant_id = metadata.get("tenant_id")
        user_id = metadata.get("user_id")
        plan = metadata.get("plan", "starter")
        is_signup = metadata.get("signup_flow") == "true"
        
        customer_id = checkout_session.get("customer")
        subscription_id = checkout_session.get("subscription")
        customer_email = checkout_session.get("customer_details", {}).get("email")
        
        if not tenant_id:
            logger.warning(f"No tenant_id in checkout metadata: {metadata}")
            return False
        
        # ============================================
        # Step 1: Find or Create Tenant
        # ============================================
        result = await self.db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            return False
        
        # Check if already provisioned (idempotency)
        billing_config = tenant.billing_config or {}
        if billing_config.get("provisioned_at"):
            logger.info(f"Tenant {tenant_id} already provisioned, skipping")
            return True
        
        # ============================================
        # Step 2: Update Tenant Subscription
        # ============================================
        new_addons = self._get_plan_addons(plan)
        tenant.active_addons = new_addons
        
        billing_config["stripe_customer_id"] = customer_id
        billing_config["stripe_subscription_id"] = subscription_id
        billing_config["subscription_status"] = "active"
        billing_config["current_plan"] = plan
        billing_config["provisioned_at"] = datetime.utcnow().isoformat()
        billing_config["provisioned_by"] = "stripe_webhook"
        
        tenant.billing_config = billing_config
        
        # Mark onboarding step
        if is_signup:
            tenant.onboarding_step = "setup"
        
        logger.info(f"Activated plan '{plan}' for tenant {tenant_id}")
        
        # ============================================
        # Step 3: Find Admin User
        # ============================================
        user = None
        if user_id:
            result = await self.db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
        
        if not user:
            # Find any admin for this tenant
            result = await self.db.execute(
                select(User).where(
                    User.tenant_id == tenant_id,
                    User.role == UserRole.ADMIN
                )
            )
            user = result.scalar_one_or_none()
        
        # ============================================
        # Step 4: Send Welcome Email
        # ============================================
        if user and is_signup:
            try:
                await self._send_welcome_email(
                    email=user.email,
                    name=user.name,
                    restaurant_name=tenant.name,
                    plan=plan,
                    login_url=f"{FRONTEND_URL}/login",
                )
                logger.info(f"Welcome email sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
                # Don't fail provisioning due to email error
        
        # ============================================
        # Step 5: Commit Changes
        # ============================================
        await self.db.commit()
        
        logger.info(f"Successfully provisioned tenant {tenant_id} with plan {plan}")
        return True
    
    async def handle_subscription_activated(
        self,
        subscription: Dict[str, Any],
    ) -> bool:
        """
        Handle when a trial converts to paid subscription.
        
        Args:
            subscription: Stripe subscription object
        """
        metadata = subscription.get("metadata", {})
        tenant_id = metadata.get("tenant_id")
        plan = metadata.get("plan")
        
        if not tenant_id:
            # Try to find by customer ID
            customer_id = subscription.get("customer")
            if customer_id:
                result = await self.db.execute(
                    select(Tenant).where(
                        Tenant.billing_config["stripe_customer_id"].astext == customer_id
                    )
                )
                tenant = result.scalar_one_or_none()
                if tenant:
                    tenant_id = str(tenant.id)
        
        if not tenant_id:
            logger.warning(f"Could not find tenant for subscription: {subscription.get('id')}")
            return False
        
        result = await self.db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            return False
        
        # Update subscription status
        billing_config = tenant.billing_config or {}
        billing_config["subscription_status"] = subscription.get("status", "active")
        
        if plan:
            billing_config["current_plan"] = plan
            tenant.active_addons = self._get_plan_addons(plan)
        
        tenant.billing_config = billing_config
        await self.db.commit()
        
        return True
    
    async def handle_subscription_canceled(
        self,
        subscription: Dict[str, Any],
    ) -> bool:
        """
        Handle subscription cancellation - downgrade to starter.
        
        Args:
            subscription: Stripe subscription object
        """
        customer_id = subscription.get("customer")
        
        if not customer_id:
            return False
        
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.billing_config["stripe_customer_id"].astext == customer_id
            )
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            return False
        
        # Downgrade to starter (free tier)
        tenant.active_addons = self._get_plan_addons("starter")
        
        billing_config = tenant.billing_config or {}
        billing_config["subscription_status"] = "canceled"
        billing_config["current_plan"] = "starter"
        billing_config["canceled_at"] = datetime.utcnow().isoformat()
        tenant.billing_config = billing_config
        
        await self.db.commit()
        
        # Send cancellation email
        result = await self.db.execute(
            select(User).where(
                User.tenant_id == tenant.id,
                User.role == UserRole.ADMIN
            )
        )
        admin = result.scalar_one_or_none()
        
        if admin:
            try:
                await self.email_service.send_subscription_canceled(
                    to_email=admin.email,
                    name=admin.name,
                    restaurant_name=tenant.name,
                )
            except Exception as e:
                logger.error(f"Failed to send cancellation email: {e}")
        
        logger.info(f"Subscription canceled for tenant {tenant.id}")
        return True
    
    async def handle_payment_failed(
        self,
        invoice: Dict[str, Any],
    ) -> bool:
        """
        Handle failed payment - send notification.
        
        Args:
            invoice: Stripe invoice object
        """
        customer_id = invoice.get("customer")
        
        if not customer_id:
            return False
        
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.billing_config["stripe_customer_id"].astext == customer_id
            )
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            return False
        
        # Update status
        billing_config = tenant.billing_config or {}
        billing_config["subscription_status"] = "past_due"
        billing_config["payment_failed_at"] = datetime.utcnow().isoformat()
        billing_config["failed_invoice_id"] = invoice.get("id")
        tenant.billing_config = billing_config
        
        await self.db.commit()
        
        # Send payment failed email
        result = await self.db.execute(
            select(User).where(
                User.tenant_id == tenant.id,
                User.role == UserRole.ADMIN
            )
        )
        admin = result.scalar_one_or_none()
        
        if admin:
            try:
                await self.email_service.send_payment_failed(
                    to_email=admin.email,
                    name=admin.name,
                    restaurant_name=tenant.name,
                    invoice_url=invoice.get("hosted_invoice_url"),
                )
            except Exception as e:
                logger.error(f"Failed to send payment failed email: {e}")
        
        logger.warning(f"Payment failed for tenant {tenant.id}")
        return True
    
    def _get_plan_addons(self, plan: str) -> Dict[str, bool]:
        """Get addons configuration for a plan."""
        addons = {
            "self_service": True,  # Core feature: QR self-ordering enabled for ALL plans
            "kds_pro": False,
            "analytics_ai": False,
            "multi_branch": False,
            "inventory": False,
            "catering": False,
            "loyalty": False,
            "reservations": False,
            "promotions": False,
            "admin_access": False,
        }
        
        if plan == "starter":
            addons["inventory"] = True
        elif plan == "professional":
            addons.update({
                "self_service": True,
                "kds_pro": True,
                "inventory": True,
                "catering": True,
                "loyalty": True,
                "reservations": True,
            })
        elif plan == "enterprise":
            addons.update({
                "self_service": True,
                "kds_pro": True,
                "analytics_ai": True,
                "multi_branch": True,
                "inventory": True,
                "catering": True,
                "loyalty": True,
                "reservations": True,
                "promotions": True,
                "admin_access": True,
            })
        
        return addons
    
    async def _send_welcome_email(
        self,
        email: str,
        name: str,
        restaurant_name: str,
        plan: str,
        login_url: str,
    ):
        """Send welcome email to new user."""
        plan_names = {
            "starter": "Starter",
            "professional": "Professional",
            "enterprise": "Enterprise",
        }
        
        await self.email_service.send_welcome_email(
            to_email=email,
            name=name,
            restaurant_name=restaurant_name,
            plan_name=plan_names.get(plan, "Starter"),
            login_url=login_url,
        )
