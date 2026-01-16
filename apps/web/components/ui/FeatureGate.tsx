'use client';

/**
 * RestoNext MX - FeatureGate Component
 * =====================================
 * A wrapper component that hides or disables features based on user's plan.
 * 
 * Usage:
 *   <FeatureGate feature="ai_forecast" requiredPlan="enterprise">
 *     <Button>Generar Predicción con IA</Button>
 *   </FeatureGate>
 * 
 * When the user doesn't have access:
 * - Shows a locked overlay with tooltip
 * - Can optionally hide or disable the content
 * - Displays upgrade CTA
 */

import React, { ReactNode } from 'react';

// ============================================
// Types
// ============================================

export type PlanType = 'starter' | 'professional' | 'enterprise';

export type FeatureType =
    | 'pos_basic'
    | 'inventory_view'
    | 'orders_manage'
    | 'kds_full'
    | 'auto_service'
    | 'bill_splitting'
    | 'analytics_basic'
    | 'ai_forecast'
    | 'ai_upselling'
    | 'ai_procurement'
    | 'ai_catering'
    | 'multi_branch'
    | 'analytics_advanced'
    | 'white_label'
    | 'api_access';

interface FeatureGateProps {
    /** The feature to check access for */
    feature: FeatureType;
    /** Current user's plan (from auth context) */
    currentPlan?: PlanType;
    /** Required plan for this feature */
    requiredPlan?: PlanType;
    /** Children to render when access is granted */
    children: ReactNode;
    /** Behavior when access denied: 'hide' | 'disable' | 'overlay' */
    mode?: 'hide' | 'disable' | 'overlay';
    /** Custom message for the tooltip */
    lockedMessage?: string;
    /** Show upgrade button */
    showUpgrade?: boolean;
    /** Fallback content when hidden */
    fallback?: ReactNode;
}

// ============================================
// Plan Feature Mapping
// ============================================

const PLAN_FEATURES: Record<PlanType, Set<FeatureType>> = {
    starter: new Set<FeatureType>([
        'pos_basic',
        'inventory_view',
        'orders_manage',
    ]),
    professional: new Set<FeatureType>([
        'pos_basic',
        'inventory_view',
        'orders_manage',
        'kds_full',
        'auto_service',
        'bill_splitting',
        'analytics_basic',
    ]),
    enterprise: new Set<FeatureType>([
        'pos_basic',
        'inventory_view',
        'orders_manage',
        'kds_full',
        'auto_service',
        'bill_splitting',
        'analytics_basic',
        'ai_forecast',
        'ai_upselling',
        'ai_procurement',
        'ai_catering',
        'multi_branch',
        'analytics_advanced',
        'white_label',
        'api_access',
    ]),
};

const FEATURE_MESSAGES: Record<FeatureType, string> = {
    ai_forecast: 'Predicción con IA disponible en plan Enterprise',
    ai_upselling: 'Sugerencias con IA disponible en plan Enterprise',
    ai_procurement: 'Compras inteligentes disponible en plan Enterprise',
    ai_catering: 'Planificador de eventos disponible en plan Enterprise',
    kds_full: 'KDS avanzado disponible en plan Professional',
    auto_service: 'Auto-Servicio QR disponible en plan Professional',
    bill_splitting: 'División de cuentas disponible en plan Professional',
    analytics_basic: 'Analytics disponible en plan Professional',
    analytics_advanced: 'Analytics avanzado disponible en plan Enterprise',
    multi_branch: 'Multi-sucursal disponible en plan Enterprise',
    white_label: 'White label disponible en plan Enterprise',
    api_access: 'Acceso API disponible en plan Enterprise',
    pos_basic: 'POS incluido en todos los planes',
    inventory_view: 'Inventario incluido en todos los planes',
    orders_manage: 'Gestión de órdenes incluida en todos los planes',
};

const PLAN_HIERARCHY: Record<PlanType, number> = {
    starter: 0,
    professional: 1,
    enterprise: 2,
};

// ============================================
// Helper Functions
// ============================================

function hasFeature(plan: PlanType, feature: FeatureType): boolean {
    return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

function getRequiredPlan(feature: FeatureType): PlanType {
    for (const plan of ['starter', 'professional', 'enterprise'] as PlanType[]) {
        if (PLAN_FEATURES[plan].has(feature)) {
            return plan;
        }
    }
    return 'enterprise';
}

// ============================================
// Lock Icon Component
// ============================================

function LockIcon({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

// ============================================
// Sparkle Icon (for upgrade)
// ============================================

function SparkleIcon({ className = '' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
        </svg>
    );
}

// ============================================
// Tooltip Component
// ============================================

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [visible, setVisible] = React.useState(false);

    const positionClasses: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    className={`
            absolute z-50 px-3 py-2 text-sm text-white 
            bg-gray-900 rounded-lg shadow-lg whitespace-nowrap
            ${positionClasses[position]}
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
                >
                    {content}
                    <div
                        className={`
              absolute w-2 h-2 bg-gray-900 rotate-45
              ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
              ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
            `}
                    />
                </div>
            )}
        </div>
    );
}

// ============================================
// Main FeatureGate Component
// ============================================

export function FeatureGate({
    feature,
    currentPlan = 'starter',
    requiredPlan,
    children,
    mode = 'overlay',
    lockedMessage,
    showUpgrade = true,
    fallback,
}: FeatureGateProps) {
    // Determine if user has access
    const hasAccess = hasFeature(currentPlan, feature);

    // Get the message to display
    const message = lockedMessage || FEATURE_MESSAGES[feature] || 'Función bloqueada';

    // Get required plan if not specified
    const planRequired = requiredPlan || getRequiredPlan(feature);

    // If user has access, render children normally
    if (hasAccess) {
        return <>{children}</>;
    }

    // Handle different modes for locked content
    switch (mode) {
        case 'hide':
            return fallback ? <>{fallback}</> : null;

        case 'disable':
            return (
                <Tooltip content={message}>
                    <div className="relative opacity-50 cursor-not-allowed select-none pointer-events-none">
                        {children}
                    </div>
                </Tooltip>
            );

        case 'overlay':
        default:
            return (
                <div className="relative group">
                    {/* Blurred/dimmed content */}
                    <div className="relative opacity-40 blur-[1px] pointer-events-none select-none transition-all duration-300 group-hover:opacity-30">
                        {children}
                    </div>

                    {/* Lock overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/50">
                        {/* Lock icon */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-3">
                            <LockIcon className="w-5 h-5 text-amber-400" />
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-300 text-center px-4 max-w-xs">
                            {message}
                        </p>

                        {/* Upgrade button */}
                        {showUpgrade && (
                            <button
                                onClick={() => window.location.href = '/settings/billing'}
                                className="
                  mt-4 px-4 py-2 text-sm font-medium text-white
                  bg-gradient-to-r from-amber-500 to-orange-500
                  hover:from-amber-400 hover:to-orange-400
                  rounded-lg shadow-lg shadow-amber-500/20
                  transition-all duration-200 hover:scale-105
                  flex items-center gap-2
                "
                            >
                                <SparkleIcon className="w-4 h-4" />
                                Actualizar a {planRequired.charAt(0).toUpperCase() + planRequired.slice(1)}
                            </button>
                        )}
                    </div>
                </div>
            );
    }
}

// ============================================
// Hook for programmatic access checking
// ============================================

export function useFeatureAccess(currentPlan: PlanType = 'starter') {
    const checkFeature = React.useCallback(
        (feature: FeatureType): boolean => {
            return hasFeature(currentPlan, feature);
        },
        [currentPlan]
    );

    const getFeatureMessage = React.useCallback(
        (feature: FeatureType): string => {
            return FEATURE_MESSAGES[feature] || 'Función no disponible';
        },
        []
    );

    const getUpgradePlan = React.useCallback(
        (feature: FeatureType): PlanType => {
            return getRequiredPlan(feature);
        },
        []
    );

    return {
        hasAccess: checkFeature,
        getMessage: getFeatureMessage,
        getUpgradePlan,
    };
}

// ============================================
// Locked Badge Component 
// ============================================

interface LockedBadgeProps {
    plan: PlanType;
    size?: 'sm' | 'md' | 'lg';
}

export function LockedBadge({ plan, size = 'sm' }: LockedBadgeProps) {
    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
        lg: 'text-sm px-3 py-1.5',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1 font-medium rounded-full
        bg-gradient-to-r from-amber-500/20 to-orange-500/20
        text-amber-400 border border-amber-500/30
        ${sizeClasses[size]}
      `}
        >
            <LockIcon className="w-3 h-3" />
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
    );
}

// ============================================
// Feature Card Component (for upgrade pages)
// ============================================

interface FeatureCardProps {
    feature: FeatureType;
    title: string;
    description: string;
    icon?: ReactNode;
    currentPlan?: PlanType;
}

export function FeatureCard({
    feature,
    title,
    description,
    icon,
    currentPlan = 'starter',
}: FeatureCardProps) {
    const isLocked = !hasFeature(currentPlan, feature);
    const requiredPlan = getRequiredPlan(feature);

    return (
        <div
            className={`
        relative p-6 rounded-xl border transition-all duration-300
        ${isLocked
                    ? 'bg-gray-900/50 border-gray-700/50 opacity-75'
                    : 'bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-500/30'
                }
      `}
        >
            {/* Lock badge for locked features */}
            {isLocked && (
                <div className="absolute top-4 right-4">
                    <LockedBadge plan={requiredPlan} />
                </div>
            )}

            {/* Icon */}
            {icon && (
                <div
                    className={`
            w-12 h-12 rounded-lg flex items-center justify-center mb-4
            ${isLocked
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }
          `}
                >
                    {icon}
                </div>
            )}

            {/* Content */}
            <h3 className={`text-lg font-semibold mb-2 ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                {title}
            </h3>
            <p className={`text-sm ${isLocked ? 'text-gray-500' : 'text-gray-400'}`}>
                {description}
            </p>

            {/* Checkmark or lock icon */}
            <div className="mt-4">
                {isLocked ? (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <LockIcon className="w-3 h-3" />
                        Requiere {requiredPlan}
                    </span>
                ) : (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Incluido en tu plan
                    </span>
                )}
            </div>
        </div>
    );
}

export default FeatureGate;
