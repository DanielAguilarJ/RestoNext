'use client';

/**
 * RestoNext MX - Onboarding Wizard
 * ==================================
 * Beautiful multi-step onboarding experience for new restaurant owners.
 * 
 * Features:
 * - Full-screen modal experience
 * - Step-by-step progress indicator
 * - Animated transitions between steps
 * - Logo upload with preview
 * - Quick configuration options
 * - Optional demo data seeding
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles,
    ChefHat,
    Upload,
    Check,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Building2,
    Palette,
    Globe,
    Utensils,
    Truck,
    ShoppingBag,
    Car,
    Rocket,
    PartyPopper,
    Play,
    X,
    Image as ImageIcon,
    Store,
    CreditCard,
    Zap,
} from 'lucide-react';

// API Configuration
// API Configuration
const getApiBaseUrl = (): string => {
    let envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://whale-app-i6h36.ondigitalocean.app/api';

    // HOTFIX: Correct invalid API subdomain if present due to misconfiguration
    if (envUrl.includes("api.whale-app-i6h36.ondigitalocean.app")) {
        console.warn("[Onboarding] Correcting invalid API URL:", envUrl);
        envUrl = "https://whale-app-i6h36.ondigitalocean.app/api";
    }

    // If running on server-side, return the env URL as-is
    if (typeof window === "undefined") {
        return envUrl.replace(/\/+$/, "");
    }

    // If it's a relative path (starts with /), prefix with window origin
    if (envUrl.startsWith("/")) {
        return `${window.location.origin}${envUrl}`;
    }

    // Remove trailing slashes for consistency
    return envUrl.replace(/\/+$/, "");
};

const API_BASE_URL = getApiBaseUrl();

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();

    // Debug: Log token status
    if (!token) {
        console.warn('[OnboardingWizard] No access token found in localStorage');
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log('[OnboardingWizard] Making API request to:', url);

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            // Handle specific HTTP errors
            if (response.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
            if (response.status === 403) {
                throw new Error('No tienes permiso para realizar esta acción.');
            }
            if (response.status === 404) {
                throw new Error('Recurso no encontrado. El endpoint puede estar incorrecto.');
            }
            if (response.status === 422) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Error de validación');
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
        }

        return response.json();
    } catch (error: any) {
        // Handle network errors specifically
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            console.error('[OnboardingWizard] Network error - possible causes: CORS, server down, wrong URL');
            console.error('[OnboardingWizard] API URL:', url);
            console.error('[OnboardingWizard] Token present:', !!token);

            if (!token) {
                throw new Error('No se encontró token de autenticación. Por favor, inicia el proceso de registro nuevamente desde /checkout');
            }
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté disponible.');
        }
        throw error;
    }
}

// Types
interface TenantData {
    name: string;
    logo_url: string;
    currency: string;
    service_types: string[];
}

interface OnboardingWizardProps {
    isOpen: boolean;
    onComplete: () => void;
    tenantName?: string;
}

// Step configuration
const steps = [
    { id: 'welcome', title: 'Bienvenido', icon: <Sparkles className="w-6 h-6" /> },
    { id: 'identity', title: 'Identidad', icon: <Building2 className="w-6 h-6" /> },
    { id: 'config', title: 'Configuración', icon: <Palette className="w-6 h-6" /> },
    { id: 'complete', title: '¡Listo!', icon: <Rocket className="w-6 h-6" /> },
];

// Currency options
const currencies = [
    { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
    { code: 'USD', name: 'Dólar Americano', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
];

// Service types
const serviceTypes = [
    { id: 'dine_in', name: 'Comedor', icon: <Utensils className="w-6 h-6" />, description: 'Servicio en mesas' },
    { id: 'delivery', name: 'Domicilio', icon: <Truck className="w-6 h-6" />, description: 'Entregas a domicilio' },
    { id: 'take_away', name: 'Para Llevar', icon: <ShoppingBag className="w-6 h-6" />, description: 'Pedidos para llevar' },
    { id: 'drive_thru', name: 'Drive-Thru', icon: <Car className="w-6 h-6" />, description: 'Servicio en auto' },
];

export default function OnboardingWizard({ isOpen, onComplete, tenantName = 'tu restaurante' }: OnboardingWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seedingDemo, setSeedingDemo] = useState(false);

    // Form data
    const [formData, setFormData] = useState<TenantData>({
        name: tenantName,
        logo_url: '',
        currency: 'MXN',
        service_types: ['dine_in'],
    });

    // Logo preview
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Handle step navigation with animation
    const goToStep = useCallback((step: number) => {
        if (step < 0 || step >= steps.length || isAnimating) return;

        setIsAnimating(true);
        setTimeout(() => {
            setCurrentStep(step);
            setIsAnimating(false);
        }, 300);
    }, [isAnimating]);

    // Handle logo upload
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setFormData(prev => ({ ...prev, logo_url: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Toggle service type
    const toggleServiceType = (typeId: string) => {
        setFormData(prev => {
            const current = prev.service_types;
            if (current.includes(typeId)) {
                // Don't allow removing all service types
                if (current.length === 1) return prev;
                return { ...prev, service_types: current.filter(t => t !== typeId) };
            } else {
                return { ...prev, service_types: [...current, typeId] };
            }
        });
    };

    // Handle form submission
    const handleComplete = async (withDemoData: boolean = false) => {
        try {
            setLoading(true);

            if (withDemoData) {
                setSeedingDemo(true);
            }

            // Submit onboarding data
            await apiRequest('/onboarding/quick-complete', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    logo_url: formData.logo_url,
                    currency: formData.currency,
                    service_types: formData.service_types,
                    seed_demo_data: withDemoData,
                }),
            });

            // Show completion for a moment
            await new Promise(resolve => setTimeout(resolve, 1500));

            onComplete();
        } catch (err: any) {
            console.error('Onboarding failed:', err);
            alert('Error al completar el onboarding: ' + (err.message || 'Error desconocido'));
        } finally {
            setLoading(false);
            setSeedingDemo(false);
        }
    };

    // Don't render if not open
    if (!isOpen) return null;

    // Step renderers
    const renderWelcomeStep = () => (
        <div className="text-center max-w-2xl mx-auto">
            {/* Animated Logo */}
            <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center animate-pulse shadow-2xl shadow-violet-500/30">
                    <ChefHat className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4">
                ¡Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">RestoNext</span>!
            </h2>

            <p className="text-xl text-slate-300 mb-8">
                Estamos emocionados de tenerte aquí. En solo <span className="text-violet-400 font-semibold">3 minutos</span> tendrás tu restaurante listo para operar.
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                    { icon: <Store className="w-6 h-6" />, label: 'POS Inteligente' },
                    { icon: <Utensils className="w-6 h-6" />, label: 'Gestión de Mesas' },
                    { icon: <Zap className="w-6 h-6" />, label: 'IA Predictiva' },
                ].map((feature, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <div className="text-violet-400 mb-2">{feature.icon}</div>
                        <p className="text-slate-300 text-sm font-medium">{feature.label}</p>
                    </div>
                ))}
            </div>

            {/* Video Preview (placeholder) */}
            <div className="relative aspect-video max-w-lg mx-auto mb-8 bg-slate-800/80 rounded-2xl border border-slate-700/50 overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                    <ChefHat className="w-8 h-8 text-violet-400" />
                    <div className="text-left">
                        <p className="text-white font-medium">Tour rápido de RestoNext</p>
                        <p className="text-slate-400 text-sm">2 minutos</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderIdentityStep = () => (
        <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Identidad de tu Restaurante</h2>
                <p className="text-slate-400">Personaliza cómo se verá tu negocio</p>
            </div>

            {/* Logo Upload */}
            <div className="mb-8">
                <label className="block text-slate-300 font-medium mb-3">Logo del Restaurante</label>
                <div className="flex items-center gap-6">
                    <div className="relative">
                        {logoPreview ? (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-violet-500/50">
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => { setLogoPreview(null); setFormData(prev => ({ ...prev, logo_url: '' })); }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-600 hover:border-violet-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                <Upload className="w-6 h-6 text-slate-500 mb-1" />
                                <span className="text-xs text-slate-500">Subir</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-slate-400 text-sm mb-2">
                            Sube el logo de tu restaurante. Recomendamos una imagen cuadrada de al menos 512x512px.
                        </p>
                        <p className="text-slate-500 text-xs">PNG, JPG o SVG. Máximo 2MB.</p>
                    </div>
                </div>
            </div>

            {/* Restaurant Name */}
            <div className="mb-8">
                <label className="block text-slate-300 font-medium mb-3">Nombre del Restaurante</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="El Buen Sabor"
                    className="w-full px-4 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white text-lg placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
            </div>

            {/* Preview */}
            <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-4">Vista previa</p>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <ChefHat className="w-8 h-8 text-violet-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-white font-semibold text-xl">{formData.name || 'Tu Restaurante'}</p>
                        <p className="text-slate-400 text-sm">Powered by RestoNext</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderConfigStep = () => (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
                    <Palette className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Configuración Rápida</h2>
                <p className="text-slate-400">Define cómo opera tu restaurante</p>
            </div>

            {/* Currency Selection */}
            <div className="mb-8">
                <label className="block text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    Moneda Principal
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {currencies.map((currency) => (
                        <button
                            key={currency.code}
                            onClick={() => setFormData(prev => ({ ...prev, currency: currency.code }))}
                            className={`p-4 rounded-xl border-2 transition-all ${formData.currency === currency.code
                                ? 'bg-violet-500/20 border-violet-500 text-white'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            <p className="text-2xl font-bold mb-1">{currency.symbol}</p>
                            <p className="text-sm font-medium">{currency.code}</p>
                            <p className="text-xs opacity-70">{currency.name}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Service Types */}
            <div className="mb-8">
                <label className="block text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-slate-400" />
                    Tipos de Servicio
                    <span className="text-slate-500 text-sm font-normal">(selecciona al menos uno)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                    {serviceTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => toggleServiceType(type.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${formData.service_types.includes(type.id)
                                ? 'bg-emerald-500/20 border-emerald-500'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${formData.service_types.includes(type.id)
                                    ? 'bg-emerald-500/30 text-emerald-400'
                                    : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {type.icon}
                                </div>
                                <div>
                                    <p className={`font-medium ${formData.service_types.includes(type.id) ? 'text-white' : 'text-slate-300'
                                        }`}>
                                        {type.name}
                                    </p>
                                    <p className="text-slate-500 text-sm">{type.description}</p>
                                </div>
                                {formData.service_types.includes(type.id) && (
                                    <Check className="w-5 h-5 text-emerald-400 ml-auto" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 text-sm">Configuración seleccionada:</p>
                <p className="text-white">
                    <span className="font-medium">{currencies.find(c => c.code === formData.currency)?.name}</span>
                    {' • '}
                    <span className="text-emerald-400">
                        {formData.service_types.map(t => serviceTypes.find(st => st.id === t)?.name).join(', ')}
                    </span>
                </p>
            </div>
        </div>
    );

    const renderCompleteStep = () => (
        <div className="text-center max-w-xl mx-auto">
            {/* Success Animation */}
            <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse">
                    {loading ? (
                        <Loader2 className="w-16 h-16 text-white animate-spin" />
                    ) : (
                        <PartyPopper className="w-16 h-16 text-white" />
                    )}
                </div>
                {!loading && (
                    <>
                        <div className="absolute top-0 left-1/4 w-4 h-4 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="absolute top-4 right-1/4 w-3 h-3 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="absolute bottom-0 right-1/3 w-5 h-5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </>
                )}
            </div>

            <h2 className="text-4xl font-bold text-white mb-4">
                {loading ? (
                    seedingDemo ? 'Creando datos de demostración...' : 'Configurando...'
                ) : (
                    '¡Todo Listo!'
                )}
            </h2>

            <p className="text-xl text-slate-300 mb-8">
                {loading ? (
                    'Por favor espera mientras preparamos tu restaurante...'
                ) : (
                    <>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400 font-semibold">
                            {formData.name}
                        </span>
                        {' '}está configurado y listo para despegar 🚀
                    </>
                )}
            </p>

            {!loading && (
                <>
                    {/* Summary Card */}
                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-8 text-left">
                        <h3 className="text-lg font-semibold text-white mb-4">Resumen de Configuración</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Restaurante:</span>
                                <span className="text-white font-medium">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Moneda:</span>
                                <span className="text-white">{formData.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Servicios:</span>
                                <span className="text-emerald-400">
                                    {formData.service_types.map(t => serviceTypes.find(st => st.id === t)?.name).join(', ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <button
                            onClick={() => handleComplete(false)}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <Rocket className="w-6 h-6" />
                            Comenzar desde Cero
                        </button>

                        <button
                            onClick={() => handleComplete(true)}
                            disabled={loading}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <Zap className="w-5 h-5 text-amber-400" />
                            Cargar Datos de Demostración
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Recomendado</span>
                        </button>

                        <p className="text-slate-500 text-sm">
                            Los datos de demostración incluyen menú, mesas e inventario de ejemplo
                        </p>
                    </div>
                </>
            )}
        </div>
    );

    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: return renderWelcomeStep();
            case 1: return renderIdentityStep();
            case 2: return renderConfigStep();
            case 3: return renderCompleteStep();
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2EiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

            {/* Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative h-full flex flex-col">
                {/* Progress Header */}
                <div className="p-8">
                    <div className="max-w-2xl mx-auto">
                        {/* Step Indicators */}
                        <div className="flex items-center justify-between">
                            {steps.map((step, idx) => (
                                <React.Fragment key={step.id}>
                                    <div
                                        className={`flex items-center gap-2 ${idx <= currentStep ? 'text-white' : 'text-slate-500'}`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${idx < currentStep
                                                ? 'bg-emerald-500'
                                                : idx === currentStep
                                                    ? 'bg-violet-500'
                                                    : 'bg-slate-700'
                                                }`}
                                        >
                                            {idx < currentStep ? (
                                                <Check className="w-5 h-5 text-white" />
                                            ) : (
                                                step.icon
                                            )}
                                        </div>
                                        <span className={`font-medium hidden md:block ${idx <= currentStep ? 'text-white' : 'text-slate-500'}`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div
                                            className={`flex-1 h-1 mx-4 rounded-full transition-colors ${idx < currentStep ? 'bg-emerald-500' : 'bg-slate-700'
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-auto px-8 py-4">
                    <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        {renderStepContent()}
                    </div>
                </div>

                {/* Navigation Footer */}
                <div className="p-8 border-t border-slate-800">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        {currentStep > 0 && currentStep < 3 ? (
                            <button
                                onClick={() => goToStep(currentStep - 1)}
                                className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Atrás
                            </button>
                        ) : (
                            <div />
                        )}

                        {currentStep < 3 && (
                            <button
                                onClick={() => goToStep(currentStep + 1)}
                                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
                            >
                                {currentStep === 0 ? 'Comenzar' : 'Siguiente'}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
