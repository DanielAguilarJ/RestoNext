'use client';

/**
 * RestoNext MX - Billing Settings Page
 * =====================================
 * Self-service subscription management for restaurant owners.
 * 
 * Features:
 * - Current plan display with upgrade options
 * - Stripe Checkout integration
 * - Customer Portal access for invoices
 * - Plan comparison matrix
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    CreditCard,
    CheckCircle,
    Crown,
    Rocket,
    Building2,
    ExternalLink,
    Sparkles,
    Receipt,
    ArrowRight,
    Check,
    X,
    Loader2,
    AlertCircle,
    PartyPopper,
    Shield,
} from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Token utilities
const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

// API Functions
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
    }
    return response.json();
}

// Types
interface Plan {
    id: string;
    name: string;
    price_mxn: number;
    features: string[];
    is_current: boolean;
    is_upgrade: boolean;
}

interface CurrentSubscription {
    plan: string;
    plan_name: string;
    price_mxn: number;
    features: string[];
    status: string;
    stripe_customer_id?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
}

// Plan icons mapping
const planIcons: Record<string, React.ReactNode> = {
    starter: <Rocket className="w-8 h-8" />,
    professional: <Crown className="w-8 h-8" />,
    enterprise: <Building2 className="w-8 h-8" />,
};

// Plan colors mapping
const planColors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
    starter: {
        bg: 'bg-slate-800/50',
        border: 'border-slate-600',
        text: 'text-slate-300',
        gradient: 'from-slate-500 to-slate-700',
    },
    professional: {
        bg: 'bg-violet-900/30',
        border: 'border-violet-500',
        text: 'text-violet-300',
        gradient: 'from-violet-500 to-purple-700',
    },
    enterprise: {
        bg: 'bg-amber-900/30',
        border: 'border-amber-500',
        text: 'text-amber-300',
        gradient: 'from-amber-500 to-orange-600',
    },
};

// Feature comparison matrix
const featureMatrix = [
    { name: 'POS Básico', starter: true, professional: true, enterprise: true },
    { name: 'Gestión de Inventario', starter: true, professional: true, enterprise: true },
    { name: 'Hasta 5 mesas', starter: true, professional: false, enterprise: false },
    { name: 'Mesas ilimitadas', starter: false, professional: true, enterprise: true },
    { name: 'KDS (Kitchen Display)', starter: false, professional: true, enterprise: true },
    { name: 'Auto-Servicio QR', starter: false, professional: true, enterprise: true },
    { name: 'División de Cuentas', starter: false, professional: true, enterprise: true },
    { name: 'Analytics Básico', starter: false, professional: true, enterprise: true },
    { name: 'Pronósticos con IA', starter: false, professional: false, enterprise: true },
    { name: 'Sugerencias de Venta IA', starter: false, professional: false, enterprise: true },
    { name: 'Multi-sucursal', starter: false, professional: false, enterprise: true },
    { name: 'API Access', starter: false, professional: false, enterprise: true },
    { name: 'White Label', starter: false, professional: false, enterprise: true },
    { name: 'Soporte Prioritario', starter: false, professional: false, enterprise: true },
];

export default function BillingSettingsPage() {
    const searchParams = useSearchParams();
    const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check for success/cancel from Stripe redirect
    useEffect(() => {
        const success = searchParams.get('success');
        const canceled = searchParams.get('canceled');
        const plan = searchParams.get('plan');

        if (success === 'true' && plan) {
            setSuccessMessage(`¡Felicidades! Tu plan ha sido actualizado a ${plan.charAt(0).toUpperCase() + plan.slice(1)}. 🎉`);
            // Clear URL params
            window.history.replaceState({}, '', '/settings/billing');
        } else if (canceled === 'true') {
            setError('El proceso de pago fue cancelado. Puedes intentar de nuevo cuando gustes.');
            window.history.replaceState({}, '', '/settings/billing');
        }
    }, [searchParams]);

    // Load subscription data
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [currentRes, plansRes] = await Promise.all([
                    apiRequest<CurrentSubscription>('/subscription/current'),
                    apiRequest<{ plans: Plan[] }>('/subscription/plans'),
                ]);
                setCurrentPlan(currentRes);
                setPlans(plansRes.plans);
            } catch (err) {
                console.error('Failed to load subscription data:', err);
                setError('No se pudo cargar la información de tu suscripción.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Handle plan upgrade
    const handleUpgrade = async (planId: string) => {
        try {
            setCheckoutLoading(planId);
            setError(null);

            const response = await apiRequest<{ checkout_url: string }>('/subscription/checkout', {
                method: 'POST',
                body: JSON.stringify({ plan: planId }),
            });

            // Redirect to Stripe Checkout
            window.location.href = response.checkout_url;
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'No se pudo iniciar el proceso de pago.');
            setCheckoutLoading(null);
        }
    };

    // Handle portal access
    const handlePortal = async () => {
        try {
            setPortalLoading(true);
            setError(null);

            const response = await apiRequest<{ portal_url: string }>('/subscription/portal', {
                method: 'POST',
            });

            // Redirect to Stripe Customer Portal
            window.location.href = response.portal_url;
        } catch (err: any) {
            console.error('Portal error:', err);
            setError(err.message || 'No se pudo acceder al portal de facturación.');
            setPortalLoading(false);
        }
    };

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Activo' },
            trialing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Período de prueba' },
            past_due: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Pago pendiente' },
            canceled: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Cancelado' },
        };
        const config = statusConfig[status] || statusConfig.active;

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-300">Cargando información de facturación...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                        <CreditCard className="w-10 h-10 text-violet-400" />
                        Facturación y Planes
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Administra tu suscripción a RestoNext
                    </p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl flex items-center gap-4">
                        <PartyPopper className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="text-emerald-300 font-medium">{successMessage}</p>
                            <p className="text-emerald-400/70 text-sm mt-1">
                                Los cambios están activos inmediatamente.
                            </p>
                        </div>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="ml-auto text-emerald-400 hover:text-emerald-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-4">
                        <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                        <p className="text-red-300">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-400 hover:text-red-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Current Plan Card */}
                {currentPlan && (
                    <div className={`mb-10 p-8 rounded-3xl border-2 ${planColors[currentPlan.plan]?.border || 'border-slate-600'} ${planColors[currentPlan.plan]?.bg || 'bg-slate-800/50'} backdrop-blur-xl`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${planColors[currentPlan.plan]?.gradient || 'from-slate-500 to-slate-700'}`}>
                                    {planIcons[currentPlan.plan] || <Rocket className="w-8 h-8 text-white" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold text-white">
                                            Plan {currentPlan.plan_name}
                                        </h2>
                                        <StatusBadge status={currentPlan.status} />
                                    </div>
                                    <p className="text-slate-400 mt-1">
                                        <span className="text-3xl font-bold text-white">${currentPlan.price_mxn.toLocaleString()}</span>
                                        <span className="text-slate-500"> MXN/mes</span>
                                    </p>
                                    {currentPlan.current_period_end && (
                                        <p className="text-slate-500 text-sm mt-2">
                                            {currentPlan.cancel_at_period_end
                                                ? `Tu plan termina el ${new Date(currentPlan.current_period_end).toLocaleDateString('es-MX')}`
                                                : `Próxima facturación: ${new Date(currentPlan.current_period_end).toLocaleDateString('es-MX')}`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>

                            {currentPlan.stripe_customer_id && (
                                <button
                                    onClick={handlePortal}
                                    disabled={portalLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all disabled:opacity-50"
                                >
                                    {portalLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Receipt className="w-5 h-5" />
                                    )}
                                    <span>Ver Facturas</span>
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Current Plan Features */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {currentPlan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-slate-300">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Plan Cards */}
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                    Elige tu Plan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative p-6 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] ${plan.is_current
                                    ? `${planColors[plan.id]?.border || 'border-slate-600'} ${planColors[plan.id]?.bg || 'bg-slate-800/50'}`
                                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.id === 'professional' && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full text-white text-sm font-medium">
                                    Más Popular
                                </div>
                            )}

                            {/* Current Badge */}
                            {plan.is_current && (
                                <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 rounded-full text-white text-xs font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Tu Plan Actual
                                </div>
                            )}

                            <div className="text-center mb-6 mt-4">
                                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${planColors[plan.id]?.gradient || 'from-slate-500 to-slate-700'} mb-4`}>
                                    {planIcons[plan.id]}
                                </div>
                                <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                                <p className="mt-2">
                                    <span className="text-4xl font-bold text-white">${plan.price_mxn.toLocaleString()}</span>
                                    <span className="text-slate-500"> /mes</span>
                                </p>
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-slate-300">
                                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {plan.is_current ? (
                                <button
                                    disabled
                                    className="w-full py-3 rounded-xl bg-slate-700 text-slate-400 cursor-not-allowed"
                                >
                                    Plan Actual
                                </button>
                            ) : plan.is_upgrade ? (
                                <button
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={checkoutLoading !== null}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {checkoutLoading === plan.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Mejorar a {plan.name}</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="w-full py-3 rounded-xl bg-slate-700/50 text-slate-500 cursor-not-allowed"
                                >
                                    Plan Inferior
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Feature Comparison Table */}
                <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8">
                    <h3 className="text-2xl font-bold text-white mb-6">
                        Comparación Detallada de Planes
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Característica</th>
                                    <th className="text-center py-4 px-4 text-slate-300 font-medium">Starter</th>
                                    <th className="text-center py-4 px-4 text-violet-300 font-medium">Professional</th>
                                    <th className="text-center py-4 px-4 text-amber-300 font-medium">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {featureMatrix.map((feature, idx) => (
                                    <tr key={idx} className="border-b border-slate-800">
                                        <td className="py-4 px-4 text-slate-300">{feature.name}</td>
                                        <td className="py-4 px-4 text-center">
                                            {feature.starter ? (
                                                <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                            ) : (
                                                <X className="w-5 h-5 text-slate-600 mx-auto" />
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {feature.professional ? (
                                                <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                            ) : (
                                                <X className="w-5 h-5 text-slate-600 mx-auto" />
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {feature.enterprise ? (
                                                <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                            ) : (
                                                <X className="w-5 h-5 text-slate-600 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Security Footer */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Pagos seguros procesados por Stripe. Cumplimiento PCI DSS.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
