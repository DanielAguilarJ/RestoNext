"""
RestoNext MX - SaaS Feature Gating & Plan Permissions
======================================================
Control access to features based on tenant subscription plan.

This module implements "Feature Gating" - a core SaaS pattern that:
1. Defines which features each plan includes
2. Provides FastAPI dependencies to protect endpoints
3. Returns clear "Upgrade" messages when access is denied

Plans:
- Starter: POS, Basic Inventory
- Professional: + KDS, Auto-Service 
- Enterprise: + AI (Forecast/Upselling), Multi-branch

Usage:
    from app.core.permissions import require_feature
    
    @router.post("/ai/forecast")
    async def get_forecast(
        tenant: Tenant = Depends(require_feature("ai_forecast"))
    ):
        ...

Author: RestoNext Team
"""

from enum import Enum
from typing import Dict, Set, Optional, Callable
from functools import wraps

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel

from app.models.models import Tenant, User


# ============================================
# Plan Definitions
# ============================================

class SubscriptionPlan(str, Enum):
    """Available subscription plans."""
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Feature(str, Enum):
    """
    All gated features in the system.
    
    Naming convention: module_capability
    """
    # Core (all plans)
    POS_BASIC = "pos_basic"
    INVENTORY_VIEW = "inventory_view"
    ORDERS_MANAGE = "orders_manage"
    
    # Professional tier
    KDS_FULL = "kds_full"
    AUTO_SERVICE = "auto_service"
    BILL_SPLITTING = "bill_splitting"
    ANALYTICS_BASIC = "analytics_basic"
    
    # Enterprise tier
    AI_FORECAST = "ai_forecast"
    AI_UPSELLING = "ai_upselling"
    AI_PROCUREMENT = "ai_procurement"
    AI_CATERING = "ai_catering"
    MULTI_BRANCH = "multi_branch"
    ANALYTICS_ADVANCED = "analytics_advanced"
    WHITE_LABEL = "white_label"
    API_ACCESS = "api_access"


# ============================================
# Feature-to-Plan Mapping
# ============================================

PLAN_FEATURES: Dict[SubscriptionPlan, Set[Feature]] = {
    SubscriptionPlan.STARTER: {
        Feature.POS_BASIC,
        Feature.INVENTORY_VIEW,
        Feature.ORDERS_MANAGE,
    },
    
    SubscriptionPlan.PROFESSIONAL: {
        # Includes Starter
        Feature.POS_BASIC,
        Feature.INVENTORY_VIEW,
        Feature.ORDERS_MANAGE,
        # Professional additions
        Feature.KDS_FULL,
        Feature.AUTO_SERVICE,
        Feature.BILL_SPLITTING,
        Feature.ANALYTICS_BASIC,
    },
    
    SubscriptionPlan.ENTERPRISE: {
        # Includes Professional
        Feature.POS_BASIC,
        Feature.INVENTORY_VIEW,
        Feature.ORDERS_MANAGE,
        Feature.KDS_FULL,
        Feature.AUTO_SERVICE,
        Feature.BILL_SPLITTING,
        Feature.ANALYTICS_BASIC,
        # Enterprise additions
        Feature.AI_FORECAST,
        Feature.AI_UPSELLING,
        Feature.AI_PROCUREMENT,
        Feature.AI_CATERING,
        Feature.MULTI_BRANCH,
        Feature.ANALYTICS_ADVANCED,
        Feature.WHITE_LABEL,
        Feature.API_ACCESS,
    },
}


# ============================================
# Plan Pricing (for metrics)
# ============================================

PLAN_PRICING: Dict[SubscriptionPlan, float] = {
    SubscriptionPlan.STARTER: 999.00,      # MXN/month
    SubscriptionPlan.PROFESSIONAL: 2499.00,
    SubscriptionPlan.ENTERPRISE: 5999.00,
}


# ============================================
# Upgrade Messages
# ============================================

FEATURE_UPGRADE_MESSAGES: Dict[Feature, str] = {
    Feature.AI_FORECAST: "La predicción con IA está disponible en el plan Enterprise. ¡Actualiza ahora para optimizar tus compras!",
    Feature.AI_UPSELLING: "Las sugerencias de venta con IA requieren el plan Enterprise. ¡Aumenta tu ticket promedio!",
    Feature.AI_PROCUREMENT: "La compra inteligente con IA está disponible en Enterprise. ¡Reduce tu desperdicio hasta 30%!",
    Feature.AI_CATERING: "El planificador de eventos con IA requiere el plan Enterprise.",
    Feature.KDS_FULL: "El KDS avanzado está disponible desde el plan Professional.",
    Feature.AUTO_SERVICE: "El Auto-Servicio QR requiere el plan Professional o superior.",
    Feature.MULTI_BRANCH: "La gestión multi-sucursal está disponible en el plan Enterprise.",
    Feature.ANALYTICS_ADVANCED: "Analytics avanzado con IA requiere el plan Enterprise.",
}


# ============================================
# Helper Functions
# ============================================

def get_tenant_plan(tenant: Tenant) -> SubscriptionPlan:
    """
    Determine the tenant's subscription plan from their active_addons.
    
    Logic:
    - If analytics_ai is enabled -> Enterprise
    - If self_service is enabled -> Professional
    - Otherwise -> Starter
    """
    addons = tenant.active_addons or {}
    
    if addons.get("analytics_ai", False):
        return SubscriptionPlan.ENTERPRISE
    elif addons.get("self_service", False) or addons.get("kds_pro", False):
        return SubscriptionPlan.PROFESSIONAL
    else:
        return SubscriptionPlan.STARTER


def has_feature(tenant: Tenant, feature: Feature) -> bool:
    """Check if a tenant has access to a specific feature."""
    plan = get_tenant_plan(tenant)
    return feature in PLAN_FEATURES[plan]


def get_plan_price(plan: SubscriptionPlan) -> float:
    """Get monthly price for a plan."""
    return PLAN_PRICING.get(plan, 0)


def list_tenant_features(tenant: Tenant) -> Set[Feature]:
    """Get all features available to a tenant."""
    plan = get_tenant_plan(tenant)
    return PLAN_FEATURES[plan]


# ============================================
# FastAPI Dependencies
# ============================================

from app.core.security import get_current_tenant, get_current_user


def require_feature(feature: Feature | str):
    """
    FastAPI dependency to check if the current tenant has access to a feature.
    
    Usage:
        @router.post("/ai/forecast")
        async def get_forecast(
            tenant: Tenant = Depends(require_feature(Feature.AI_FORECAST))
        ):
            ...
    
    Args:
        feature: The feature to check (Feature enum or string)
        
    Returns:
        Dependency that returns the Tenant if authorized
        
    Raises:
        HTTPException 403: If feature is not available for the tenant's plan
    """
    # Convert string to Feature enum if needed
    if isinstance(feature, str):
        try:
            feature = Feature(feature)
        except ValueError:
            # If not a valid feature string, treat as legacy addon check
            pass
    
    async def feature_checker(
        tenant: Tenant = Depends(get_current_tenant),
    ) -> Tenant:
        # Check if tenant has the feature
        if not has_feature(tenant, feature):
            plan = get_tenant_plan(tenant)
            upgrade_message = FEATURE_UPGRADE_MESSAGES.get(
                feature,
                f"Esta función requiere actualizar tu plan desde {plan.value}."
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "feature_not_available",
                    "feature": feature.value if isinstance(feature, Feature) else feature,
                    "current_plan": plan.value,
                    "required_plan": _get_required_plan(feature).value,
                    "message": upgrade_message,
                    "upgrade_url": "/settings/billing"
                }
            )
        
        return tenant
    
    return feature_checker


def require_plan(min_plan: SubscriptionPlan):
    """
    FastAPI dependency to check if tenant has at least the specified plan.
    
    Usage:
        @router.get("/advanced-analytics")
        async def analytics(
            tenant: Tenant = Depends(require_plan(SubscriptionPlan.PROFESSIONAL))
        ):
            ...
    """
    plan_hierarchy = {
        SubscriptionPlan.STARTER: 0,
        SubscriptionPlan.PROFESSIONAL: 1,
        SubscriptionPlan.ENTERPRISE: 2,
    }
    
    async def plan_checker(
        tenant: Tenant = Depends(get_current_tenant),
    ) -> Tenant:
        current_plan = get_tenant_plan(tenant)
        
        if plan_hierarchy[current_plan] < plan_hierarchy[min_plan]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "plan_upgrade_required",
                    "current_plan": current_plan.value,
                    "required_plan": min_plan.value,
                    "message": f"Esta función requiere el plan {min_plan.value.capitalize()} o superior.",
                    "upgrade_url": "/settings/billing"
                }
            )
        
        return tenant
    
    return plan_checker


class UserHasFeature:
    """
    Class-based dependency for feature checking.
    
    Usage:
        @router.post("/ai/forecast")
        async def forecast(
            _: None = Depends(UserHasFeature("ai_forecast"))
        ):
            ...
    
    This is syntactic sugar that's more readable in route definitions.
    """
    
    def __init__(self, feature_name: str):
        self.feature_name = feature_name
        try:
            self.feature = Feature(feature_name)
        except ValueError:
            self.feature = None
    
    async def __call__(
        self,
        tenant: Tenant = Depends(get_current_tenant),
        current_user: User = Depends(get_current_user),
    ) -> Tenant:
        if self.feature is None:
            # Legacy addon check
            addons = tenant.active_addons or {}
            if not addons.get(self.feature_name, False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "addon_not_enabled",
                        "addon": self.feature_name,
                        "message": f"El módulo '{self.feature_name}' no está habilitado para tu cuenta.",
                        "upgrade_url": "/settings/billing"
                    }
                )
        else:
            if not has_feature(tenant, self.feature):
                plan = get_tenant_plan(tenant)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "feature_not_available",
                        "feature": self.feature.value,
                        "current_plan": plan.value,
                        "required_plan": _get_required_plan(self.feature).value,
                        "message": FEATURE_UPGRADE_MESSAGES.get(
                            self.feature,
                            "Actualiza tu plan para acceder a esta función."
                        ),
                        "upgrade_url": "/settings/billing"
                    }
                )
        
        return tenant


def _get_required_plan(feature: Feature) -> SubscriptionPlan:
    """Get the minimum plan required for a feature."""
    for plan in [SubscriptionPlan.STARTER, SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE]:
        if feature in PLAN_FEATURES[plan]:
            return plan
    return SubscriptionPlan.ENTERPRISE


# ============================================
# Utility Response Models
# ============================================

class PlanInfo(BaseModel):
    """Plan information for API responses."""
    plan: str
    price_monthly: float
    features: list[str]


class FeatureAccessResponse(BaseModel):
    """Feature access check response."""
    has_access: bool
    current_plan: str
    required_plan: Optional[str] = None
    message: Optional[str] = None


# ============================================
# Plan Info Endpoint Helper
# ============================================

def get_all_plans_info() -> list[PlanInfo]:
    """Get information about all available plans."""
    return [
        PlanInfo(
            plan=plan.value,
            price_monthly=PLAN_PRICING[plan],
            features=[f.value for f in features]
        )
        for plan, features in PLAN_FEATURES.items()
    ]


def check_feature_access(tenant: Tenant, feature: Feature) -> FeatureAccessResponse:
    """Check if a tenant has access to a feature and return detailed info."""
    if has_feature(tenant, feature):
        return FeatureAccessResponse(
            has_access=True,
            current_plan=get_tenant_plan(tenant).value
        )
    else:
        return FeatureAccessResponse(
            has_access=False,
            current_plan=get_tenant_plan(tenant).value,
            required_plan=_get_required_plan(feature).value,
            message=FEATURE_UPGRADE_MESSAGES.get(feature)
        )
