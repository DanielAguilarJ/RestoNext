"use client";

import { m, AnimatePresence } from "framer-motion";
import { CreditCard, Check, X, Sparkles, ArrowRight, HelpCircle, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useState, memo } from "react";

// ============================================
// Pricing Plans Data
// ============================================
const pricingPlans = [
    {
        id: "starter",
        name: "Starter",
        description: "Ideal para restaurantes pequeños",
        price: 999,
        priceAnnual: 799,
        features: [
            { text: "POS Completo", included: true },
            { text: "Hasta 10 mesas", included: true },
            { text: "Inventario básico", included: true },
            { text: "Facturación CFDI 4.0", included: true },
            { text: "2 usuarios", included: true },
            { text: "Soporte por email", included: true },
            { text: "Kitchen Display (KDS)", included: false },
            { text: "Menú QR", included: false },
            { text: "IA Predictiva", included: false },
        ],
        highlighted: false,
        cta: "Comenzar Gratis",
        ctaSecondary: "14 días de prueba",
    },
    {
        id: "professional",
        name: "Professional",
        description: "Para restaurantes en crecimiento",
        price: 2499,
        priceAnnual: 1999,
        features: [
            { text: "Todo de Starter", included: true, highlight: true },
            { text: "Mesas ilimitadas", included: true },
            { text: "Kitchen Display (KDS)", included: true },
            { text: "Menú QR Auto-Servicio", included: true },
            { text: "División de cuentas", included: true },
            { text: "Reportes avanzados", included: true },
            { text: "5 usuarios incluidos", included: true },
            { text: "Soporte prioritario 24/7", included: true },
            { text: "IA Predicción básica", included: true },
        ],
        highlighted: true,
        cta: "Comenzar Gratis",
        ctaSecondary: "El más popular",
        badge: "⭐ Más Popular",
        savings: "Ahorra $6,000/año",
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Para cadenas y franquicias",
        price: 5999,
        priceAnnual: 4999,
        features: [
            { text: "Todo de Professional", included: true, highlight: true },
            { text: "IA Predictiva Avanzada", included: true },
            { text: "Multi-sucursal", included: true },
            { text: "API Access completo", included: true },
            { text: "White Label / Marca propia", included: true },
            { text: "Usuarios ilimitados", included: true },
            { text: "Gerente de cuenta dedicado", included: true },
            { text: "SLA garantizado 99.99%", included: true },
            { text: "Integraciones personalizadas", included: true },
        ],
        highlighted: false,
        cta: "Contactar Ventas",
        ctaSecondary: "Demo personalizada",
    },
];

// ============================================
// Feature Row Component
// ============================================
const FeatureRow = memo(function FeatureRow({
    feature
}: {
    feature: { text: string; included: boolean; highlight?: boolean }
}) {
    return (
        <li className="flex items-start gap-3">
            {feature.included ? (
                <div className="mt-0.5 p-0.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                </div>
            ) : (
                <div className="mt-0.5 p-0.5 rounded-full bg-zinc-700 shrink-0">
                    <X className="w-3.5 h-3.5 text-zinc-500" />
                </div>
            )}
            <span className={`text-sm ${feature.included
                    ? feature.highlight
                        ? 'text-brand-300 font-medium'
                        : 'text-zinc-200'
                    : 'text-zinc-500'
                }`}>
                {feature.text}
            </span>
        </li>
    );
});

// ============================================
// Pricing Card Component
// ============================================
interface PricingCardProps {
    plan: typeof pricingPlans[0];
    isAnnual: boolean;
    index: number;
}

const PricingCard = memo(function PricingCard({ plan, isAnnual, index }: PricingCardProps) {
    const price = isAnnual ? plan.priceAnnual : plan.price;
    const monthlyEquivalent = isAnnual ? Math.round(plan.priceAnnual) : plan.price;

    return (
        <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className={`relative rounded-3xl overflow-hidden ${plan.highlighted
                    ? 'bg-gradient-to-b from-brand-600/30 via-brand-600/10 to-zinc-900 border-2 border-brand-500/50 shadow-2xl shadow-brand-500/20'
                    : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700'
                }`}
        >
            {/* Popular Badge with animation */}
            {plan.highlighted && (
                <m.div
                    className="absolute -top-1 left-0 right-0 flex justify-center"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span className="px-5 py-2 bg-gradient-to-r from-brand-500 via-orange-500 to-brand-500 text-white text-sm font-bold rounded-b-xl shadow-lg shadow-brand-500/30">
                        {plan.badge}
                    </span>
                </m.div>
            )}

            <div className="p-8 pt-10">
                {/* Plan Header */}
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-zinc-400">{plan.description}</p>
                </div>

                {/* Price Display */}
                <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                        <AnimatePresence mode="wait">
                            <m.span
                                key={isAnnual ? 'annual' : 'monthly'}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="text-5xl font-bold text-white"
                            >
                                ${monthlyEquivalent.toLocaleString()}
                            </m.span>
                        </AnimatePresence>
                        <span className="text-zinc-500">/mes</span>
                    </div>

                    {isAnnual && plan.savings && (
                        <m.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full"
                        >
                            {plan.savings}
                        </m.span>
                    )}

                    <p className="text-xs text-zinc-500 mt-2">
                        + IVA • Facturación {isAnnual ? 'anual' : 'mensual'}
                    </p>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                        <FeatureRow key={i} feature={feature} />
                    ))}
                </ul>

                {/* CTA Button */}
                <Link
                    href={plan.id === 'enterprise' ? '/contact' : `/checkout?plan=${plan.id}&billing=${isAnnual ? 'annual' : 'monthly'}`}
                    className={`group block w-full py-4 px-6 text-center font-bold rounded-xl transition-all duration-300 ${plan.highlighted
                            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>

                {/* Secondary CTA text */}
                <p className="text-center text-xs text-zinc-500 mt-3">
                    {plan.ctaSecondary}
                </p>
            </div>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
export default function PricingSection() {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section id="pricing" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[200px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[200px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-6">
                        <CreditCard className="w-4 h-4" />
                        <span>Precios Transparentes</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Elige el plan perfecto{" "}
                        <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">
                            para tu negocio
                        </span>
                    </h2>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
                        Todos los planes incluyen 14 días de prueba gratis. Sin tarjeta de crédito.
                        Cancela cuando quieras.
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-4 p-2 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${!isAnnual
                                    ? 'bg-white text-zinc-900 shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${isAnnual
                                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            Anual
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                -20%
                            </span>
                        </button>
                    </div>
                </m.div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {pricingPlans.map((plan, idx) => (
                        <PricingCard key={plan.id} plan={plan} isAnnual={isAnnual} index={idx} />
                    ))}
                </div>

                {/* Trust & Guarantee Section */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800"
                >
                    {[
                        {
                            icon: Shield,
                            title: "Garantía de 30 días",
                            description: "Si no estás satisfecho, te devolvemos tu dinero sin preguntas.",
                            color: "text-emerald-400"
                        },
                        {
                            icon: Zap,
                            title: "Migración gratuita",
                            description: "Te ayudamos a migrar tus datos desde cualquier sistema anterior.",
                            color: "text-amber-400"
                        },
                        {
                            icon: Sparkles,
                            title: "Sin contratos",
                            description: "Cancela cuando quieras. Sin permanencias ni penalizaciones.",
                            color: "text-blue-400"
                        },
                    ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                            <div className={`p-3 rounded-xl bg-zinc-800 ${item.color}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                <p className="text-sm text-zinc-400">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </m.div>

                {/* FAQ Link */}
                <m.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-12"
                >
                    <p className="text-zinc-400">
                        ¿Tienes preguntas?{" "}
                        <Link href="/faq" className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1">
                            <HelpCircle className="w-4 h-4" />
                            Ver preguntas frecuentes
                        </Link>
                    </p>
                </m.div>
            </div>
        </section>
    );
}
