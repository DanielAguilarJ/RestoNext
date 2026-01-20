"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
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
    Clock,
    ArrowRight,
    Check,
    Star,
    Menu,
    X,
    ChevronDown,
    Smartphone,
    CreditCard,
    FileText,
    TrendingUp,
} from "lucide-react";

// ============================================
// Hero Section
// ============================================
function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Gradient Orbs */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-brand-600/30 rounded-full blur-[100px] animate-float" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-brand-500/10 to-transparent rounded-full" />

                {/* Grid Pattern */}
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
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8"
                >
                    <Sparkles className="w-4 h-4 text-brand-400" />
                    <span className="text-sm font-medium text-brand-300">
                        Potenciado con Inteligencia Artificial
                    </span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                >
                    El Sistema{" "}
                    <span className="relative">
                        <span className="relative z-10 bg-gradient-to-r from-brand-400 via-brand-500 to-orange-500 bg-clip-text text-transparent">
                            POS
                        </span>
                        <span className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-orange-500/20 blur-lg" />
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
                    sola plataforma. <span className="text-white font-medium">Reduce costos hasta un 30%</span> con IA predictiva.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <Link
                        href="/checkout?plan=starter"
                        className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-300 hover:scale-105"
                    >
                        <span>Comenzar Prueba Gratis</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
                    </Link>
                    <Link
                        href="#demo"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                        <span>Ver Demo</span>
                        <ChevronDown className="w-5 h-5" />
                    </Link>
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-16 flex flex-wrap justify-center items-center gap-8 text-zinc-500"
                >
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm">CFDI 4.0 Certificado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        <span className="text-sm">Pagos con Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span className="text-sm">Setup en 5 minutos</span>
                    </div>
                </motion.div>
            </div>

            {/* Floating UI Preview */}
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
                    <div className="rounded-t-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 shadow-2xl p-2">
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
                            {/* Mock Content */}
                            <div className="h-48 bg-zinc-950 p-4">
                                <div className="grid grid-cols-4 gap-4 h-full">
                                    <div className="col-span-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 animate-pulse" />
                                    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
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
    },
    {
        icon: ChefHat,
        title: "Kitchen Display (KDS)",
        description: "Pantalla en cocina con tiempos de preparación, prioridades y notificaciones en tiempo real.",
        color: "from-orange-500 to-red-500",
    },
    {
        icon: Package,
        title: "Inventario con IA",
        description: "Controla stock, mermas y costos. Predicción de compras con Machine Learning.",
        color: "from-emerald-500 to-teal-500",
    },
    {
        icon: FileText,
        title: "Facturación CFDI 4.0",
        description: "Genera facturas electrónicas válidas ante el SAT con un clic. Cancelación automática.",
        color: "from-purple-500 to-pink-500",
    },
    {
        icon: QrCode,
        title: "Menú Digital QR",
        description: "Comensales ordenan desde su celular. Sin fricciones, sin esperas.",
        color: "from-violet-500 to-purple-500",
    },
    {
        icon: BarChart3,
        title: "Analytics Avanzado",
        description: "Dashboards en tiempo real, reportes de ventas, productos más vendidos y predicciones.",
        color: "from-amber-500 to-orange-500",
    },
];

function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-zinc-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-brand-500 font-semibold text-sm uppercase tracking-wider">
                        Funcionalidades
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Todo lo que necesitas,{" "}
                        <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">
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
                            className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1"
                        >
                            {/* Icon */}
                            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {feature.description}
                            </p>

                            {/* Hover Glow */}
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
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
        <section id="pricing" className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-brand-500 font-semibold text-sm uppercase tracking-wider">
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
                        <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>
                            Mensual
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative w-14 h-8 bg-zinc-800 rounded-full p-1 transition-colors"
                        >
                            <span
                                className={`block w-6 h-6 bg-brand-500 rounded-full transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>
                            Anual
                            <span className="ml-2 text-xs text-brand-400 font-medium">
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
                            className={`relative rounded-2xl p-8 ${plan.highlighted
                                    ? 'bg-gradient-to-b from-brand-600/20 to-brand-600/5 border-2 border-brand-500/50'
                                    : 'bg-zinc-900/50 border border-zinc-800'
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1 bg-brand-500 text-white text-sm font-medium rounded-full">
                                        Más Popular
                                    </span>
                                </div>
                            )}

                            {/* Plan Name */}
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>

                            {/* Price */}
                            <div className="mt-6 flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">
                                    ${isAnnual ? plan.priceAnnual.toLocaleString() : plan.price.toLocaleString()}
                                </span>
                                <span className="text-zinc-500">/mes + IVA</span>
                            </div>

                            {/* Features */}
                            <ul className="mt-8 space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-brand-400' : 'text-emerald-400'
                                            }`} />
                                        <span className="text-zinc-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href={`/checkout?plan=${plan.id}&billing=${isAnnual ? 'annual' : 'monthly'}`}
                                className={`mt-8 block w-full py-3 px-4 text-center font-semibold rounded-xl transition-all duration-300 ${plan.highlighted
                                        ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
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
        role: "Dueña, Tacos El Patrón",
        image: "/testimonials/maria.jpg",
        content: "RestoNext revolucionó mi negocio. Antes tardaba 2 horas en cuadrar caja, ahora 10 minutos. La facturación automática es un sueño.",
        rating: 5,
    },
    {
        name: "Roberto Hernández",
        role: "Gerente, Mariscos Costa Azul",
        image: "/testimonials/roberto.jpg",
        content: "El KDS en cocina eliminó los errores de comandas. Mis cocineros aman la pantalla y los clientes reciben su comida más rápido.",
        rating: 5,
    },
    {
        name: "Ana Torres",
        role: "Administradora, Café Central",
        image: "/testimonials/ana.jpg",
        content: "La predicción de inventario con IA nos ha ahorrado miles de pesos en desperdicio. Súper recomendado.",
        rating: 5,
    },
];

function TestimonialsSection() {
    return (
        <section className="py-24 bg-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-brand-500 font-semibold text-sm uppercase tracking-wider">
                        Testimonios
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Lo que dicen nuestros clientes
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, idx) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700"
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-zinc-300 leading-relaxed mb-6">
                                "{testimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white font-bold">
                                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{testimonial.name}</p>
                                    <p className="text-sm text-zinc-400">{testimonial.role}</p>
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
// CTA Section
// ============================================
function CTASection() {
    return (
        <section className="py-24 bg-gradient-to-br from-brand-600 via-brand-500 to-orange-500 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        ¿Listo para transformar tu restaurante?
                    </h2>
                    <p className="text-xl text-white/80 mb-10">
                        Únete a más de 500 restaurantes que ya usan RestoNext.
                        Comienza tu prueba gratis hoy.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/checkout?plan=starter"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-brand-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                        >
                            <span>Comenzar Prueba Gratis</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="#pricing"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                        >
                            Ver Planes
                        </Link>
                    </div>

                    <p className="mt-6 text-sm text-white/60">
                        Sin tarjeta de crédito • Setup en 5 minutos • Soporte 24/7
                    </p>
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
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center">
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
                    <p>© 2024 RestoNext. Todos los derechos reservados. Hecho con 🌮 en México.</p>
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

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
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
                            className="px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
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
                            className="block w-full py-3 bg-brand-500 text-white font-medium rounded-lg text-center"
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
            <FeaturesSection />
            <PricingSection />
            <TestimonialsSection />
            <CTASection />
            <Footer />
        </main>
    );
}
