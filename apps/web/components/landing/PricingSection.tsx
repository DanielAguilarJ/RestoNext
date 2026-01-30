"use client";

import { m } from "framer-motion";
import { CreditCard, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// ============================================
// Pricing Section
// ============================================
const pricingPlans = [
    {
        id: "starter",
        name: "Starter",
        description: "Perfecto para restaurantes pequeños",
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
        highlighted: false,
        cta: "Comenzar",
    },
    {
        id: "professional",
        name: "Professional",
        description: "Para restaurantes en crecimiento",
        price: 2499,
        priceAnnual: 1999,
        features: [
            "Todo de Starter, más:",
            "Mesas ilimitadas",
            "KDS Avanzado",
            "Menú QR Auto-Servicio",
            "División de cuentas",
            "5 usuarios incluidos",
            "Soporte prioritario",
        ],
        highlighted: true,
        cta: "Más Popular",
        badge: "Más Popular",
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Para cadenas y franquicias",
        price: 5999,
        priceAnnual: 4999,
        features: [
            "Todo de Professional, más:",
            "IA Predictiva (Pronósticos)",
            "Multi-sucursal",
            "API Access completo",
            "White Label",
            "Usuarios ilimitados",
            "Gerente de Cuenta dedicado",
        ],
        highlighted: false,
        cta: "Contactar Ventas",
    },
];

export default function PricingSection() {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section id="pricing" className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/pricing-bg.png')] bg-cover bg-center opacity-10 mix-blend-soft-light" />
            {/* Background gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-4">
                        <CreditCard className="w-4 h-4" />
                        Precios
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Elige tu plan{" "}
                        <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">
                            sin compromisos
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-zinc-400">
                        14 días de prueba gratis. Cancela cuando quieras.
                    </p>

                    {/* Billing Toggle */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>
                            Mensual
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative w-16 h-8 bg-zinc-800 rounded-full p-1 transition-colors border border-zinc-700"
                        >
                            <m.span
                                className="block w-6 h-6 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full shadow-lg"
                                animate={{ x: isAnnual ? 32 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>
                            Anual
                            <span className="ml-2 px-2 py-0.5 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                                Ahorra 20%
                            </span>
                        </span>
                    </div>
                </m.div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {pricingPlans.map((plan, idx) => (
                        <m.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -8 }}
                            className={`relative rounded-2xl p-8 backdrop-blur-sm ${plan.highlighted
                                ? 'bg-gradient-to-b from-brand-600/20 via-brand-600/10 to-zinc-900/80 border-2 border-brand-500/50 shadow-xl shadow-brand-500/10'
                                : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700'
                                }`}
                        >
                            {/* Popular Badge with animation */}
                            {plan.highlighted && (
                                <m.div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <span className="px-4 py-1.5 bg-gradient-to-r from-brand-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg shadow-brand-500/30">
                                        ⭐ Más Popular
                                    </span>
                                </m.div>
                            )}

                            {/* Plan Name */}
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>

                            {/* Price with animation */}
                            <div className="mt-6 flex items-baseline gap-2">
                                <m.span
                                    key={isAnnual ? 'annual' : 'monthly'}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl font-bold text-white"
                                >
                                    ${isAnnual ? plan.priceAnnual.toLocaleString() : plan.price.toLocaleString()}
                                </m.span>
                                <span className="text-zinc-500">/mes + IVA</span>
                            </div>

                            {/* Features */}
                            <ul className="mt-8 space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-0.5 rounded-full ${plan.highlighted ? 'bg-brand-500' : 'bg-emerald-500'}`}>
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-zinc-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href={`/checkout?plan=${plan.id}&billing=${isAnnual ? 'annual' : 'monthly'}`}
                                className={`mt-8 block w-full py-3.5 px-4 text-center font-semibold rounded-xl transition-all duration-300 ${plan.highlighted
                                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30'
                                    : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </m.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
