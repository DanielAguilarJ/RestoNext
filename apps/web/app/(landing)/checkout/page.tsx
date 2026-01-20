"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
    UtensilsCrossed,
    Check,
    Shield,
    ArrowLeft,
    Loader2,
    CreditCard,
    Building,
    Mail,
    User,
    Lock,
} from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Plan configurations
const PLANS = {
    starter: {
        name: "Starter",
        price: 999,
        priceAnnual: 799,
        features: [
            "POS Básico",
            "Hasta 5 mesas",
            "Inventario básico",
            "Facturación CFDI 4.0",
            "1 usuario administrador",
            "Soporte por email",
        ],
    },
    professional: {
        name: "Professional",
        price: 2499,
        priceAnnual: 1999,
        features: [
            "Todo de Starter",
            "Mesas ilimitadas",
            "KDS Avanzado",
            "Menú QR Auto-Servicio",
            "División de cuentas",
            "5 usuarios incluidos",
            "Soporte prioritario",
        ],
    },
    enterprise: {
        name: "Enterprise",
        price: 5999,
        priceAnnual: 4999,
        features: [
            "Todo de Professional",
            "IA Predictiva (Pronósticos)",
            "Multi-sucursal",
            "API Access completo",
            "White Label",
            "Usuarios ilimitados",
            "Gerente de Cuenta dedicado",
        ],
    },
};

type PlanId = keyof typeof PLANS;

interface FormData {
    restaurantName: string;
    email: string;
    password: string;
    confirmPassword: string;
    rfc: string;
    acceptTerms: boolean;
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const planId = (searchParams.get("plan") || "starter") as PlanId;
    const billingType = searchParams.get("billing") || "annual";

    const [step, setStep] = useState<"form" | "processing" | "error">("form");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        restaurantName: "",
        email: "",
        password: "",
        confirmPassword: "",
        rfc: "",
        acceptTerms: false,
    });

    const plan = PLANS[planId] || PLANS.starter;
    const price = billingType === "annual" ? plan.priceAnnual : plan.price;
    const totalAnnual = billingType === "annual" ? price * 12 : price * 12;
    const savings = billingType === "annual" ? (plan.price - plan.priceAnnual) * 12 : 0;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const validateForm = (): string | null => {
        if (!formData.restaurantName.trim()) {
            return "El nombre del restaurante es requerido";
        }
        if (!formData.email.trim() || !formData.email.includes("@")) {
            return "Email válido es requerido";
        }
        if (formData.password.length < 8) {
            return "La contraseña debe tener al menos 8 caracteres";
        }
        if (formData.password !== formData.confirmPassword) {
            return "Las contraseñas no coinciden";
        }
        if (!formData.acceptTerms) {
            return "Debes aceptar los términos y condiciones";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError(null);
        setStep("processing");

        try {
            // Step 1: Create user account and tenant
            const signupResponse = await fetch(`${API_BASE_URL}/auth/signup-checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurant_name: formData.restaurantName,
                    email: formData.email,
                    password: formData.password,
                    rfc: formData.rfc || undefined,
                    plan: planId,
                    billing_cycle: billingType,
                }),
            });

            if (!signupResponse.ok) {
                const errorData = await signupResponse.json();
                throw new Error(errorData.detail || "Error al crear la cuenta");
            }

            const { access_token, checkout_session_url } = await signupResponse.json();

            // Step 2: Redirect to Stripe Checkout
            if (checkout_session_url) {
                window.location.href = checkout_session_url;
            } else {
                // If no checkout URL, plan might be free trial
                router.push("/onboarding?success=true");
            }

        } catch (err: any) {
            console.error("Checkout error:", err);
            setError(err.message || "Error al procesar el pago. Intenta de nuevo.");
            setStep("error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">RestoNext</span>
                        </Link>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Shield className="w-4 h-4" />
                            <span>Pago seguro con Stripe</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Link
                    href="/#pricing"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a planes</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Crear tu cuenta
                        </h1>
                        <p className="text-zinc-400 mb-8">
                            Completa tus datos para comenzar tu prueba de 14 días.
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Restaurant Name */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Nombre del Restaurante
                                </label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="text"
                                        name="restaurantName"
                                        value={formData.restaurantName}
                                        onChange={handleInputChange}
                                        placeholder="Mi Restaurante"
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="tu@email.com"
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RFC (optional) */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    RFC (opcional)
                                </label>
                                <input
                                    type="text"
                                    name="rfc"
                                    value={formData.rfc}
                                    onChange={handleInputChange}
                                    placeholder="XAXX010101000"
                                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all uppercase"
                                    maxLength={13}
                                />
                                <p className="mt-1 text-xs text-zinc-500">
                                    Para facturación fiscal. Puedes agregarlo después.
                                </p>
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleInputChange}
                                    className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-brand-500 focus:ring-brand-500"
                                    required
                                />
                                <label className="text-sm text-zinc-400">
                                    Acepto los{" "}
                                    <Link href="/legal/terms" className="text-brand-400 hover:underline">
                                        Términos de Servicio
                                    </Link>{" "}
                                    y la{" "}
                                    <Link href="/legal/privacy" className="text-brand-400 hover:underline">
                                        Política de Privacidad
                                    </Link>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        <span>Continuar al Pago</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>

                    {/* Right Column: Order Summary */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="sticky top-24">
                            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                                <h2 className="text-xl font-semibold text-white mb-6">
                                    Resumen de tu pedido
                                </h2>

                                {/* Plan */}
                                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                                    <div>
                                        <p className="font-medium text-white">
                                            Plan {plan.name}
                                        </p>
                                        <p className="text-sm text-zinc-400">
                                            {billingType === "annual" ? "Facturación anual" : "Facturación mensual"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-white">
                                            ${price.toLocaleString()}/mes
                                        </p>
                                        <p className="text-xs text-zinc-500">+ IVA</p>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="py-4 space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Trial Badge */}
                                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-sm font-medium text-emerald-400 mb-1">
                                        🎉 14 días de prueba gratis
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        No se te cobrará hasta que termine tu período de prueba.
                                        Cancela cuando quieras.
                                    </p>
                                </div>

                                {/* Savings */}
                                {savings > 0 && (
                                    <div className="mt-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                                        <p className="text-sm text-brand-300">
                                            Al pagar anualmente ahorras{" "}
                                            <span className="font-bold text-brand-400">
                                                ${savings.toLocaleString()} MXN
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {/* Total */}
                                <div className="mt-6 pt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-400">Total hoy</span>
                                        <span className="text-2xl font-bold text-white">$0 MXN</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1 text-right">
                                        Primer cobro después de 14 días
                                    </p>
                                </div>
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-6 flex items-center justify-center gap-6 text-zinc-500">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span className="text-xs">SSL Seguro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span className="text-xs">Stripe</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
