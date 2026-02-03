"use client";

import { memo, useMemo } from "react";
import { m, type Variants } from "framer-motion";
import { BrainCircuit, Sparkles, TrendingUp, ShoppingCart, ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ============================================
// Types
// ============================================
interface AiFeature {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
}

// ============================================
// Constants (extracted outside component to avoid re-creation)
// ============================================
const AI_FEATURES: readonly AiFeature[] = [
    {
        icon: TrendingUp,
        title: "Predicción de Ventas",
        description: "El sistema sabe cuánto venderás la próxima semana y te dice qué preparar.",
    },
    {
        icon: ShoppingCart,
        title: "Compras Automatizadas",
        description: "Genera listas de compra basadas en el consumo real y stock proyectado.",
    },
    {
        icon: BrainCircuit,
        title: "Detección de Anomalías",
        description: "Alerta automática sobre robos hormiga o mermas inusuales en tiempo real.",
    },
] as const;

const containerVariants: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: 0.2 + i * 0.1, duration: 0.5 },
    }),
};

const visualVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
};

// ============================================
// Subcomponents
// ============================================
interface FeatureCardProps {
    readonly feature: AiFeature;
    readonly index: number;
}

const FeatureCard = memo(function FeatureCard({ feature, index }: FeatureCardProps) {
    const Icon = feature.icon;
    return (
        <m.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors will-change-transform"
        >
            <div className="shrink-0 w-12 h-12 rounded-lg bg-brand-500/20 flex items-center justify-center">
                <Icon className="w-6 h-6 text-brand-400" aria-hidden="true" />
            </div>
            <div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
            </div>
        </m.div>
    );
});

const FloatingNotificationCard = memo(function FloatingNotificationCard({
    label,
    value,
    valueColor,
    delay = 0,
}: {
    readonly label: string;
    readonly value: string;
    readonly valueColor: string;
    readonly delay?: number;
}) {
    return (
        <m.div
            className="p-3 rounded-lg bg-zinc-800/90 backdrop-blur border border-zinc-700 flex items-center justify-between will-change-transform"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -5, 0] }}
            transition={{
                opacity: { duration: 0.5, delay },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
            }}
        >
            <span className="text-sm text-zinc-300">{label}</span>
            <span className={`${valueColor} font-bold text-sm`}>{value}</span>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
function AiFeatureSection() {
    const featureCards = useMemo(
        () => AI_FEATURES.map((feature, idx) => (
            <FeatureCard key={feature.title} feature={feature} index={idx} />
        )),
        []
    );

    return (
        <section
            id="ai-features"
            aria-labelledby="ai-section-heading"
            className="py-32 bg-zinc-950 relative overflow-hidden"
        >
            {/* Background Effects - CSS-only, no JS animation for performance */}
            <div
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"
                aria-hidden="true"
            />
            <div
                className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"
                aria-hidden="true"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Content Column */}
                    <m.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-8">
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                            <span>Inteligencia Artificial</span>
                        </div>

                        {/* Heading */}
                        <h2
                            id="ai-section-heading"
                            className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
                        >
                            Tu restaurante, <br />
                            <span className="bg-gradient-to-r from-brand-400 to-blue-400 bg-clip-text text-transparent">
                                más inteligente que nunca
                            </span>
                        </h2>

                        {/* Description */}
                        <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                            No solo registres ventas, anticípate al futuro. Nuestros algoritmos de
                            Machine Learning analizan tus datos históricos para optimizar cada
                            aspecto de tu negocio.
                        </p>

                        {/* Feature Cards */}
                        <div className="space-y-4" role="list" aria-label="Funciones de IA">
                            {featureCards}
                        </div>

                        {/* CTA Link */}
                        <div className="mt-10">
                            <Link
                                href="/features/ai"
                                className="inline-flex items-center gap-2 text-brand-400 font-semibold hover:text-brand-300 transition-colors group"
                            >
                                <span>Explorar todas las funciones de IA</span>
                                <ArrowRight
                                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                    </m.div>

                    {/* Visual Column */}
                    <m.div
                        variants={visualVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative hidden lg:block"
                    >
                        {/* Glow behind card */}
                        <div
                            className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none"
                            aria-hidden="true"
                        />

                        {/* Main Visual Card */}
                        <div className="relative aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
                            <Image
                                src="/ai-feature-visual.png"
                                alt="AI Dashboard Visualization"
                                fill
                                className="object-cover opacity-60 mix-blend-overlay"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                            />
                            <div
                                className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent"
                                aria-hidden="true"
                            />

                            {/* Floating Notification Cards */}
                            <div className="absolute bottom-8 left-8 right-8 z-10 space-y-3">
                                <FloatingNotificationCard
                                    label="Predicción: Tacos al Pastor"
                                    value="+25% vs semana pasada"
                                    valueColor="text-green-400"
                                    delay={0}
                                />
                                <FloatingNotificationCard
                                    label="Alerta de Stock: Cilantro"
                                    value="Reordenar Sugerido"
                                    valueColor="text-amber-400"
                                    delay={1}
                                />
                            </div>
                        </div>
                    </m.div>
                </div>
            </div>
        </section>
    );
}

export default memo(AiFeatureSection);
