"use client";

import { m } from "framer-motion";
import Link from "next/link";
import {
    UtensilsCrossed, ChefHat, Receipt, BarChart3, Package, QrCode,
    Sparkles, ArrowRight, ChevronDown, Shield, CreditCard, Zap, Globe
} from "lucide-react";

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
                <m.div
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
                </m.div>
            ))}
        </div>
    );
}

// ============================================
// Hero Section
// ============================================
export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Floating Icons */}
            <FloatingIcons />

            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Stock Image Background */}
                <div
                    className="absolute inset-0 bg-[url('/hero-restaurant-bg.png')] bg-cover bg-center opacity-20 mix-blend-luminosity filter blur-sm"
                />
                {/* Gradient Orbs with enhanced animation */}
                <m.div
                    className="absolute top-20 left-10 w-72 h-72 bg-brand-600/30 rounded-full blur-[100px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <m.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
                <m.div
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
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500/20 via-purple-500/10 to-brand-500/20 border border-brand-500/30 mb-8 backdrop-blur-sm"
                >
                    <m.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Sparkles className="w-4 h-4 text-brand-400" />
                    </m.div>
                    <span className="text-sm font-medium bg-gradient-to-r from-brand-300 to-purple-300 bg-clip-text text-transparent">
                        Potenciado con Inteligencia Artificial
                    </span>
                </m.div>

                {/* Main Heading with enhanced gradient */}
                <m.h1
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
                        <m.span
                            className="absolute -inset-2 bg-gradient-to-r from-brand-500/30 to-orange-500/30 blur-xl rounded-lg"
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </span>
                    {" "}que tu
                    <br />
                    Restaurante Merece
                </m.h1>

                {/* Subheadline */}
                <m.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10"
                >
                    Gestiona mesas, pedidos, cocina, inventario y facturación fiscal desde una
                    sola plataforma. <span className="text-white font-semibold">Reduce costos hasta un 30%</span> con IA predictiva.
                </m.p>

                {/* CTA Buttons with glow effect */}
                <m.div
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
                        <m.div
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
                </m.div>

                {/* Trust Badges with icons */}
                <m.div
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
                        <m.div
                            key={text}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(217, 45, 32, 0.5)' }}
                        >
                            <Icon className="w-4 h-4 text-brand-400" />
                            <span className="text-sm text-zinc-400">{text}</span>
                        </m.div>
                    ))}
                </m.div>
            </div>

            {/* 3D Floating UI Preview */}
            <m.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4"
            >
                <m.div
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
                                    <m.div
                                        className="col-span-3 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-lg border border-zinc-700/50"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                    <m.div
                                        className="bg-gradient-to-br from-brand-500/20 to-zinc-900/50 rounded-lg border border-brand-500/20"
                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </m.div>
            </m.div>
        </section>
    );
}
