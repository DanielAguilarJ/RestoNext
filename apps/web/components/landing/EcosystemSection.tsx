"use client";

import { memo, useMemo, useState } from "react";
import { m, type Variants, AnimatePresence } from "framer-motion";
import {
    Monitor,
    Smartphone,
    ChefHat,
    Package,
    Receipt,
    BarChart3,
    Zap,
    ArrowRight,
    CheckCircle2,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";

// ============================================
// Types
// ============================================
interface FlowStep {
    readonly id: string;
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
    readonly color: string;
    readonly gradientFrom: string;
    readonly gradientTo: string;
}

// ============================================
// Constants
// ============================================
const FLOW_STEPS: readonly FlowStep[] = [
    {
        id: "pos",
        icon: Monitor,
        title: "Tomas el Pedido",
        description: "En POS o desde el móvil del cliente con QR",
        color: "text-blue-400",
        gradientFrom: "from-blue-500",
        gradientTo: "to-cyan-400",
    },
    {
        id: "kitchen",
        icon: ChefHat,
        title: "Se Envía a Cocina",
        description: "El KDS muestra el pedido al instante con prioridades",
        color: "text-orange-400",
        gradientFrom: "from-orange-500",
        gradientTo: "to-red-400",
    },
    {
        id: "inventory",
        icon: Package,
        title: "Se Descuenta Inventario",
        description: "Cada ingrediente se actualiza automáticamente",
        color: "text-emerald-400",
        gradientFrom: "from-emerald-500",
        gradientTo: "to-teal-400",
    },
    {
        id: "billing",
        icon: Receipt,
        title: "Se Registra en Contabilidad",
        description: "Ventas, IVA y CFDI listos para el SAT",
        color: "text-purple-400",
        gradientFrom: "from-purple-500",
        gradientTo: "to-pink-400",
    },
    {
        id: "analytics",
        icon: BarChart3,
        title: "Se Analiza con IA",
        description: "Predicciones y reportes en tiempo real",
        color: "text-cyan-400",
        gradientFrom: "from-cyan-500",
        gradientTo: "to-blue-400",
    },
] as const;

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
};

const stepVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" }
    },
};

const lineVariants: Variants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
        scaleX: 1,
        opacity: 1,
        transition: { duration: 0.6, ease: "easeOut" }
    },
};

const pulseVariants: Variants = {
    initial: { scale: 1, opacity: 0.5 },
    pulse: {
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
};

// ============================================
// Subcomponents
// ============================================
interface FlowStepCardProps {
    readonly step: FlowStep;
    readonly index: number;
    readonly isActive: boolean;
    readonly onHover: (id: string | null) => void;
}

const FlowStepCard = memo(function FlowStepCard({ step, index, isActive, onHover }: FlowStepCardProps) {
    const Icon = step.icon;

    return (
        <m.div
            variants={stepVariants}
            className="relative flex flex-col items-center group"
            onMouseEnter={() => onHover(step.id)}
            onMouseLeave={() => onHover(null)}
        >
            {/* Connection Line (not on last item) */}
            {index < FLOW_STEPS.length - 1 && (
                <m.div
                    variants={lineVariants}
                    className="absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-2rem)] h-0.5 origin-left hidden lg:block"
                >
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700" />
                        {/* Animated pulse along the line */}
                        <m.div
                            className={`absolute top-0 left-0 w-4 h-full bg-gradient-to-r ${step.gradientFrom} ${step.gradientTo} rounded-full blur-sm`}
                            initial={{ left: "0%" }}
                            animate={{ left: ["0%", "100%", "0%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                        />
                    </div>
                    {/* Arrow at end */}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2">
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                    </div>
                </m.div>
            )}

            {/* Step Number Badge */}
            <m.div
                className={`absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.5 }}
            >
                {index + 1}
            </m.div>

            {/* Icon Container */}
            <div className="relative">
                {/* Glow effect */}
                <m.div
                    variants={pulseVariants}
                    initial="initial"
                    animate={isActive ? "pulse" : "initial"}
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`}
                />

                {/* Icon Box */}
                <m.div
                    className={`relative w-20 h-20 rounded-2xl bg-zinc-900 border-2 flex items-center justify-center transition-all duration-300 ${isActive
                            ? `border-transparent bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} shadow-2xl`
                            : 'border-zinc-700 group-hover:border-zinc-600'
                        }`}
                    whileHover={{ scale: 1.08, y: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    <Icon className={`w-9 h-9 ${isActive ? 'text-white' : step.color} transition-colors duration-300`} />
                </m.div>
            </div>

            {/* Text Content */}
            <div className="mt-4 text-center max-w-[160px]">
                <h3 className={`font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                    {step.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {step.description}
                </p>
            </div>

            {/* Active indicator check */}
            <AnimatePresence>
                {isActive && (
                    <m.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute -bottom-8"
                    >
                        <CheckCircle2 className={`w-5 h-5 ${step.color}`} />
                    </m.div>
                )}
            </AnimatePresence>
        </m.div>
    );
});

// Mobile Flow Card
const MobileFlowCard = memo(function MobileFlowCard({ step, index }: { step: FlowStep; index: number }) {
    const Icon = step.icon;

    return (
        <m.div
            variants={stepVariants}
            className="flex items-start gap-4 relative"
        >
            {/* Vertical Line */}
            {index < FLOW_STEPS.length - 1 && (
                <div className="absolute left-[27px] top-16 w-0.5 h-[calc(100%+1rem)] bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-700">
                    <m.div
                        className={`absolute top-0 left-0 w-full h-4 bg-gradient-to-b ${step.gradientFrom} ${step.gradientTo} rounded-full`}
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                    />
                </div>
            )}

            {/* Icon */}
            <div className={`relative shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                    {index + 1}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
                <h3 className="text-white font-semibold">{step.title}</h3>
                <p className="text-sm text-zinc-400 mt-0.5">{step.description}</p>
            </div>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
function EcosystemSection() {
    const [activeStep, setActiveStep] = useState<string | null>(null);

    const desktopSteps = useMemo(
        () => FLOW_STEPS.map((step, idx) => (
            <FlowStepCard
                key={step.id}
                step={step}
                index={idx}
                isActive={activeStep === step.id}
                onHover={setActiveStep}
            />
        )),
        [activeStep]
    );

    const mobileSteps = useMemo(
        () => FLOW_STEPS.map((step, idx) => (
            <MobileFlowCard key={step.id} step={step} index={idx} />
        )),
        []
    );

    return (
        <section
            id="ecosystem"
            aria-labelledby="ecosystem-heading"
            className="py-24 md:py-32 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 relative overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Gradient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[150px]" />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-6">
                        <Zap className="w-4 h-4" />
                        <span>Ecosistema Integrado</span>
                    </div>

                    <h2
                        id="ecosystem-heading"
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
                    >
                        Todo conectado,{" "}
                        <span className="bg-gradient-to-r from-brand-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                            en tiempo real
                        </span>
                    </h2>

                    <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        Olvídate de sistemas aislados. En RestoNext, cada acción desencadena una
                        reacción instantánea en todo tu negocio.
                    </p>
                </m.div>

                {/* Flow Diagram - Desktop */}
                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="hidden lg:grid grid-cols-5 gap-4 mb-16"
                >
                    {desktopSteps}
                </m.div>

                {/* Flow Diagram - Mobile */}
                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="lg:hidden space-y-8 mb-12"
                >
                    {mobileSteps}
                </m.div>

                {/* Bottom Info Cards */}
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6 mt-16"
                >
                    {[
                        {
                            icon: Smartphone,
                            title: "Desde cualquier dispositivo",
                            description: "Accede desde tablet, computadora o celular. Siempre sincronizado.",
                            gradient: "from-blue-500 to-cyan-500"
                        },
                        {
                            icon: Zap,
                            title: "Sincronización instantánea",
                            description: "Los cambios se reflejan en milisegundos en todos los módulos.",
                            gradient: "from-brand-500 to-orange-500"
                        },
                        {
                            icon: CheckCircle2,
                            title: "Sin errores humanos",
                            description: "Automatiza tareas repetitivas y elimina la doble captura de datos.",
                            gradient: "from-emerald-500 to-teal-500"
                        },
                    ].map((item, idx) => (
                        <m.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all duration-300"
                        >
                            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.gradient} mb-4`}>
                                <item.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                            <p className="text-sm text-zinc-400">{item.description}</p>
                        </m.div>
                    ))}
                </m.div>

                {/* CTA */}
                <m.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-12"
                >
                    <Link
                        href="/checkout?plan=starter"
                        className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105"
                    >
                        <span>Ver cómo funciona en vivo</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </m.div>
            </div>
        </section>
    );
}

export default memo(EcosystemSection);
