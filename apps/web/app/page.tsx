"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    UtensilsCrossed,
    ChefHat,
    Receipt,
    QrCode,
    Sparkles,
    Package,
    BarChart3,
    Shield,
    Zap,
    Users,
    ArrowRight,
    Check,
    Star,
    Menu,
    X,
    ChevronDown,
    CreditCard,
    FileText,
    TrendingUp,
    Clock,
    Globe,
    Smartphone,
} from "lucide-react";

// ============================================
// Animated Counter Component
// ============================================
function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (!isInView) return;

        const duration = 2000;
        const steps = 60;
        const increment = end / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [isInView, end]);

    return (
        <span ref={ref} className="tabular-nums">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}

// ============================================
// Floating Icons Background
// ============================================
function FloatingIcons() {
    const icons = [
        { Icon: UtensilsCrossed, x: "10%", y: "20%", delay: 0 },
        { Icon: ChefHat, x: "85%", y: "15%", delay: 1 },
        { Icon: Receipt, x: "75%", y: "70%", delay: 2 },
        { Icon: BarChart3, x: "15%", y: "75%", delay: 1.5 },
        { Icon: Package, x: "90%", y: "45%", delay: 0.5 },
        { Icon: QrCode, x: "5%", y: "50%", delay: 2.5 },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {icons.map(({ Icon, x, y, delay }, idx) => (
                <motion.div
                    key={idx}
                    className="absolute text-white/5"
                    style={{ left: x, top: y }}
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 6,
                        delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <Icon className="w-16 h-16" />
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// Hero Section
// ============================================
function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Floating Icons */}
            <FloatingIcons />

            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Gradient Orbs with enhanced animation */}
                <motion.div
                    className="absolute top-20 left-10 w-72 h-72 bg-brand-600/30 rounded-full blur-[100px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
                <motion.div
                    className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-brand-500/10 to-transparent rounded-full" />

                {/* Animated Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), 
                                         linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
                {/* Animated Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500/20 via-purple-500/10 to-brand-500/20 border border-brand-500/30 mb-8 backdrop-blur-sm"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Sparkles className="w-4 h-4 text-brand-400" />
                    </motion.div>
                    <span className="text-sm font-medium bg-gradient-to-r from-brand-300 to-purple-300 bg-clip-text text-transparent">
                        Potenciado con Inteligencia Artificial
                    </span>
                </motion.div>

                {/* Main Heading with enhanced gradient */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                >
                    El Sistema{" "}
                    <span className="relative inline-block">
                        <span className="relative z-10 bg-gradient-to-r from-brand-400 via-orange-400 to-brand-500 bg-clip-text text-transparent animate-text-gradient bg-[length:200%_auto]">
                            POS
                        </span>
                        <motion.span
                            className="absolute -inset-2 bg-gradient-to-r from-brand-500/30 to-orange-500/30 blur-xl rounded-lg"
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </span>
                    {" "}que tu
                    <br />
                    Restaurante Merece
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10"
                >
                    Gestiona mesas, pedidos, cocina, inventario y facturación fiscal desde una
                    sola plataforma. <span className="text-white font-semibold">Reduce costos hasta un 30%</span> con IA predictiva.
                </motion.p>

                {/* CTA Buttons with glow effect */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <Link
                        href="/checkout?plan=starter"
                        className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                    >
                        <span className="relative z-10">Comenzar Prueba Gratis</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />

                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Pulsing glow */}
                        <motion.div
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 to-orange-500 -z-10"
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ filter: 'blur(20px)' }}
                        />
                    </Link>
                    <Link
                        href="/login?demo=true"
                        className="group inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                        <span>Ver Demo</span>
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                    </Link>
                </motion.div>

                {/* Trust Badges with icons */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-16 flex flex-wrap justify-center items-center gap-8 text-zinc-500"
                >
                    {[
                        { icon: Shield, text: "CFDI 4.0 Certificado" },
                        { icon: CreditCard, text: "Pagos con Stripe" },
                        { icon: Zap, text: "Setup en 5 minutos" },
                        { icon: Globe, text: "99.9% Uptime" },
                    ].map(({ icon: Icon, text }) => (
                        <motion.div
                            key={text}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(217, 45, 32, 0.5)' }}
                        >
                            <Icon className="w-4 h-4 text-brand-400" />
                            <span className="text-sm text-zinc-400">{text}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* 3D Floating UI Preview */}
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4"
            >
                <motion.div
                    className="relative"
                    whileHover={{
                        rotateX: -5,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                    }}
                    style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
                    <div className="rounded-t-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 shadow-2xl shadow-brand-500/10 p-2">
                        <div className="bg-zinc-900 rounded-t-xl overflow-hidden">
                            {/* Mock Dashboard Header */}
                            <div className="h-12 bg-zinc-800 flex items-center px-4 gap-3">
                                <div className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <span className="text-zinc-400 text-sm">RestoNext Dashboard</span>
                            </div>
                            {/* Mock Content with animation */}
                            <div className="h-48 bg-zinc-950 p-4">
                                <div className="grid grid-cols-4 gap-4 h-full">
                                    <motion.div
                                        className="col-span-3 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-lg border border-zinc-700/50"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="bg-gradient-to-br from-brand-500/20 to-zinc-900/50 rounded-lg border border-brand-500/20"
                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
}

// ============================================
// Stats Section
// ============================================
function StatsSection() {
    const stats = [
        { value: 500, suffix: "+", label: "Restaurantes", icon: UtensilsCrossed },
        { value: 10, suffix: "M+", label: "Transacciones", icon: Receipt },
        { value: 99.9, suffix: "%", label: "Uptime", icon: Shield },
        { value: 4.9, suffix: "/5", label: "Rating", icon: Star },
    ];

    return (
        <section className="py-20 bg-zinc-950 border-y border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-center group"
                        >
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 mb-4 group-hover:scale-110 transition-transform">
                                <stat.icon className="w-6 h-6 text-brand-400" />
                            </div>
                            <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                            </div>
                            <p className="text-zinc-500 font-medium">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Features Section
// ============================================
const features = [
    {
        icon: UtensilsCrossed,
        title: "POS Inteligente",
        description: "Toma pedidos rápidamente con una interfaz touch-friendly. Modificadores, combos y promociones automáticas.",
        color: "from-blue-500 to-cyan-500",
        gradient: "from-blue-500/20 to-cyan-500/10",
    },
    {
        icon: ChefHat,
        title: "Kitchen Display (KDS)",
        description: "Pantalla en cocina con tiempos de preparación, prioridades y notificaciones en tiempo real.",
        color: "from-orange-500 to-red-500",
        gradient: "from-orange-500/20 to-red-500/10",
    },
    {
        icon: Package,
        title: "Inventario con IA",
        description: "Controla stock, mermas y costos. Predicción de compras con Machine Learning.",
        color: "from-emerald-500 to-teal-500",
        gradient: "from-emerald-500/20 to-teal-500/10",
    },
    {
        icon: FileText,
        title: "Facturación CFDI 4.0",
        description: "Genera facturas electrónicas válidas ante el SAT con un clic. Cancelación automática.",
        color: "from-purple-500 to-pink-500",
        gradient: "from-purple-500/20 to-pink-500/10",
    },
    {
        icon: QrCode,
        title: "Menú Digital QR",
        description: "Comensales ordenan desde su celular. Sin fricciones, sin esperas.",
        color: "from-violet-500 to-purple-500",
        gradient: "from-violet-500/20 to-purple-500/10",
    },
    {
        icon: BarChart3,
        title: "Analytics Avanzado",
        description: "Dashboards en tiempo real, reportes de ventas, productos más vendidos y predicciones.",
        color: "from-amber-500 to-orange-500",
        gradient: "from-amber-500/20 to-orange-500/10",
    },
];

function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-zinc-950 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-brand-500/5 to-transparent rounded-full" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-4">
                        <Zap className="w-4 h-4" />
                        Funcionalidades
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Todo lo que necesitas,{" "}
                        <span className="bg-gradient-to-r from-brand-400 via-orange-400 to-brand-500 bg-clip-text text-transparent">
                            en una sola plataforma
                        </span>
                    </h2>
                    <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
                        Módulos diseñados específicamente para restaurantes mexicanos.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            className="group relative p-6 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm overflow-hidden"
                        >
                            {/* Gradient background on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            {/* Shine effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10">
                                {/* Icon */}
                                <motion.div
                                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                >
                                    <feature.icon className="w-6 h-6 text-white" />
                                </motion.div>

                                {/* Title & Description */}
                                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Learn more link */}
                                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                    <span>Saber más</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

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

function PricingSection() {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section id="pricing" className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
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
                            <motion.span
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
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {pricingPlans.map((plan, idx) => (
                        <motion.div
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
                                <motion.div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <span className="px-4 py-1.5 bg-gradient-to-r from-brand-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg shadow-brand-500/30">
                                        ⭐ Más Popular
                                    </span>
                                </motion.div>
                            )}

                            {/* Plan Name */}
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>

                            {/* Price with animation */}
                            <div className="mt-6 flex items-baseline gap-2">
                                <motion.span
                                    key={isAnnual ? 'annual' : 'monthly'}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl font-bold text-white"
                                >
                                    ${isAnnual ? plan.priceAnnual.toLocaleString() : plan.price.toLocaleString()}
                                </motion.span>
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
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Testimonials Section
// ============================================
const testimonials = [
    {
        name: "María González",
        role: "Dueña",
        company: "Tacos El Patrón",
        content: "RestoNext revolucionó mi negocio. Antes tardaba 2 horas en cuadrar caja, ahora 10 minutos. La facturación automática es un sueño.",
        rating: 5,
        image: null,
    },
    {
        name: "Roberto Hernández",
        role: "Gerente",
        company: "Mariscos Costa Azul",
        content: "El KDS en cocina eliminó los errores de comandas. Mis cocineros aman la pantalla y los clientes reciben su comida más rápido.",
        rating: 5,
        image: null,
    },
    {
        name: "Ana Torres",
        role: "Administradora",
        company: "Café Central",
        content: "La predicción de inventario con IA nos ha ahorrado miles de pesos en desperdicio. Súper recomendado.",
        rating: 5,
        image: null,
    },
    {
        name: "Carlos Mendoza",
        role: "Propietario",
        company: "Pizzería Don Carlo",
        content: "El menú QR fue un éxito instantáneo. Nuestros clientes ordenan más rápido y nosotros procesamos más pedidos por hora.",
        rating: 5,
        image: null,
    },
    {
        name: "Laura Jiménez",
        role: "Gerente General",
        company: "Sushi Express",
        content: "La integración con Stripe nos simplificó los pagos. Todo automático, sin errores. Increíble servicio.",
        rating: 5,
        image: null,
    },
];

function TestimonialsSection() {
    return (
        <section className="py-24 bg-zinc-900 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-4">
                        <Users className="w-4 h-4" />
                        Testimonios
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Lo que dicen nuestros clientes
                    </h2>
                </motion.div>

                {/* Testimonials Carousel */}
                <div className="relative">
                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
                        {testimonials.map((testimonial, idx) => (
                            <motion.div
                                key={testimonial.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex-shrink-0 w-[350px] snap-center"
                            >
                                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm h-full">
                                    {/* Quote mark */}
                                    <div className="absolute -top-2 left-6 text-6xl font-serif text-brand-500/30 leading-none">"</div>

                                    {/* Stars */}
                                    <div className="flex gap-1 mb-4 relative z-10">
                                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <p className="text-zinc-300 leading-relaxed mb-6 relative z-10">
                                        {testimonial.content}
                                    </p>

                                    {/* Author */}
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/30">
                                            {testimonial.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{testimonial.name}</p>
                                            <p className="text-sm text-zinc-400">{testimonial.role}, {testimonial.company}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Scroll indicators */}
                    <div className="absolute left-0 top-0 bottom-8 w-20 bg-gradient-to-r from-zinc-900 to-transparent pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-8 w-20 bg-gradient-to-l from-zinc-900 to-transparent pointer-events-none" />
                </div>
            </div>
        </section>
    );
}

// ============================================
// Partners Section
// ============================================
function PartnersSection() {
    const partners = [
        { name: "Stripe", color: "#635BFF" },
        { name: "SAT", color: "#00A650" },
        { name: "Uber Eats", color: "#06C167" },
        { name: "Rappi", color: "#FF441F" },
        { name: "WhatsApp", color: "#25D366" },
        { name: "Google", color: "#4285F4" },
    ];

    return (
        <section className="py-16 bg-zinc-950 border-y border-zinc-800/50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
                <p className="text-zinc-500 text-sm uppercase tracking-wider font-medium">
                    Integra con tus herramientas favoritas
                </p>
            </div>

            {/* Infinite scroll marquee */}
            <div className="relative">
                <div className="flex animate-marquee hover:[animation-play-state:paused]">
                    {[...partners, ...partners].map((partner, idx) => (
                        <div
                            key={`${partner.name}-${idx}`}
                            className="flex-shrink-0 mx-8 px-8 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 group"
                        >
                            <div
                                className="text-2xl font-bold text-zinc-600 group-hover:text-white transition-colors duration-300"
                                style={{
                                    // @ts-ignore
                                    '--hover-color': partner.color
                                }}
                            >
                                {partner.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// CTA Section
// ============================================
function CTASection() {
    return (
        <section className="py-24 bg-gradient-to-br from-brand-600 via-brand-500 to-orange-500 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Floating shapes */}
            <motion.div
                className="absolute top-20 left-20 w-32 h-32 border border-white/20 rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div
                className="absolute bottom-20 right-20 w-48 h-48 border border-white/10 rounded-2xl"
                animate={{
                    rotate: [0, 45, 0],
                }}
                transition={{ duration: 15, repeat: Infinity }}
            />

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        ¿Listo para transformar tu restaurante?
                    </h2>
                    <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                        Únete a más de 500 restaurantes que ya usan RestoNext.
                        Comienza tu prueba gratis hoy.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/checkout?plan=starter"
                            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-brand-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                        >
                            <span>Comenzar Prueba Gratis</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="#pricing"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                        >
                            Ver Planes
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/60">
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" /> Sin tarjeta de crédito
                        </span>
                        <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Setup en 5 minutos
                        </span>
                        <span className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" /> Soporte 24/7
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// Footer
// ============================================
function Footer() {
    return (
        <footer className="py-16 bg-zinc-950 border-t border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <UtensilsCrossed className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">RestoNext</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            El sistema POS más potente para restaurantes en México.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Producto</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link></li>
                            <li><Link href="#pricing" className="hover:text-white transition-colors">Precios</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><Link href="/legal/terms" className="hover:text-white transition-colors">Términos de Servicio</Link></li>
                            <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacidad</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Soporte</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li><a href="mailto:soporte@restonext.mx" className="hover:text-white transition-colors">soporte@restonext.mx</a></li>
                            <li><a href="tel:+525555555555" className="hover:text-white transition-colors">+52 55 5555 5555</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
                    <p>© 2026 RestoNext. Todos los derechos reservados. Hecho con 🌮 en México.</p>
                </div>
            </div>
        </footer>
    );
}

// ============================================
// Navbar
// ============================================
function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50 shadow-lg shadow-black/10'
            : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
                            <UtensilsCrossed className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">RestoNext</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-zinc-400 hover:text-white transition-colors">
                            Funcionalidades
                        </Link>
                        <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors">
                            Precios
                        </Link>
                        <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
                            Iniciar Sesión
                        </Link>
                        <Link
                            href="/checkout?plan=starter"
                            className="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40"
                        >
                            Prueba Gratis
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-zinc-400 hover:text-white"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden bg-zinc-900 border-b border-zinc-800"
                >
                    <div className="px-4 py-4 space-y-4">
                        <Link href="#features" className="block text-zinc-300 hover:text-white">
                            Funcionalidades
                        </Link>
                        <Link href="#pricing" className="block text-zinc-300 hover:text-white">
                            Precios
                        </Link>
                        <Link href="/login" className="block text-zinc-300 hover:text-white">
                            Iniciar Sesión
                        </Link>
                        <Link
                            href="/checkout?plan=starter"
                            className="block w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium rounded-lg text-center"
                        >
                            Prueba Gratis
                        </Link>
                    </div>
                </motion.div>
            )}
        </nav>
    );
}

// ============================================
// Main Landing Page
// ============================================
export default function LandingPage() {
    return (
        <main className="min-h-screen bg-zinc-950">
            <Navbar />
            <HeroSection />
            <StatsSection />
            <FeaturesSection />
            <PricingSection />
            <TestimonialsSection />
            <PartnersSection />
            <CTASection />
            <Footer />
        </main>
    );
}
