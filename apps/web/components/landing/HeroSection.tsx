"use client";

import { m, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
    UtensilsCrossed, ChefHat, Receipt, BarChart3, Package, QrCode,
    Sparkles, ArrowRight, Play, Shield, CreditCard, Zap, Globe, Star,
    Check, Clock
} from "lucide-react";

// ============================================
// Floating Icons Background
// ============================================
function FloatingIcons() {
    const icons = [
        { Icon: UtensilsCrossed, x: "10%", y: "20%", delay: 0, size: "w-12 h-12" },
        { Icon: ChefHat, x: "85%", y: "15%", delay: 1, size: "w-14 h-14" },
        { Icon: Receipt, x: "75%", y: "70%", delay: 2, size: "w-10 h-10" },
        { Icon: BarChart3, x: "15%", y: "75%", delay: 1.5, size: "w-12 h-12" },
        { Icon: Package, x: "92%", y: "45%", delay: 0.5, size: "w-10 h-10" },
        { Icon: QrCode, x: "5%", y: "50%", delay: 2.5, size: "w-14 h-14" },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {icons.map(({ Icon, x, y, delay, size }, idx) => (
                <m.div
                    key={idx}
                    className="absolute text-white/[0.03]"
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
                    <Icon className={size} />
                </m.div>
            ))}
        </div>
    );
}

// ============================================
// Animated Stats Counter
// ============================================
function LiveCounter({ value, suffix }: { value: string; suffix?: string }) {
    return (
        <span className="tabular-nums font-bold">
            {value}
            {suffix && <span className="text-zinc-500">{suffix}</span>}
        </span>
    );
}

// ============================================
// Hero Section
// ============================================
export default function HeroSection() {
    const containerRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section
            ref={containerRef}
            className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950"
        >
            {/* Floating Icons */}
            <FloatingIcons />

            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Stock Image Background */}
                <m.div
                    style={{ y, opacity }}
                    className="absolute inset-0 bg-[url('/hero-restaurant-bg.png')] bg-cover bg-center opacity-15 mix-blend-luminosity"
                />

                {/* Gradient Orbs */}
                <m.div
                    className="absolute top-10 left-10 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[150px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <m.div
                    className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[180px]"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.15, 0.3, 0.15],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
                <m.div
                    className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />

                {/* Center radial gradient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent rounded-full" />

                {/* Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                                         linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-brand-500/10 border border-brand-500/20 mb-8 backdrop-blur-sm"
                >
                    <m.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Sparkles className="w-4 h-4 text-brand-400" />
                    </m.div>
                    <span className="text-sm font-medium bg-gradient-to-r from-brand-300 to-purple-300 bg-clip-text text-transparent">
                        #1 Sistema POS con IA para Restaurantes
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-semibold">4.9</span>
                    </span>
                </m.div>

                {/* Main Heading */}
                <m.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6"
                >
                    El Sistema{" "}
                    <span className="relative inline-block">
                        <span className="relative z-10 bg-gradient-to-r from-brand-400 via-orange-400 to-brand-500 bg-clip-text text-transparent">
                            Todo-en-Uno
                        </span>
                        <m.span
                            className="absolute -inset-2 bg-gradient-to-r from-brand-500/30 to-orange-500/30 blur-xl rounded-lg"
                            animate={{ opacity: [0.4, 0.7, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </span>
                    <br />
                    <span className="text-zinc-400">para tu Restaurante</span>
                </m.h1>

                {/* Subheadline */}
                <m.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-8"
                >
                    POS, Cocina, Inventario, Facturación y Reportes. Todo conectado, todo en
                    tiempo real.{" "}
                    <span className="text-white font-semibold">Reduce costos hasta 30%</span> con nuestra IA.
                </m.p>

                {/* Feature Pills */}
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-3 mb-10"
                >
                    {[
                        "POS Touch-friendly",
                        "Kitchen Display",
                        "Inventario IA",
                        "CFDI 4.0",
                        "Menú QR",
                    ].map((feature) => (
                        <span
                            key={feature}
                            className="px-3 py-1.5 text-sm text-zinc-300 bg-zinc-800/50 border border-zinc-700/50 rounded-full"
                        >
                            {feature}
                        </span>
                    ))}
                </m.div>

                {/* CTA Buttons */}
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6"
                >
                    <Link
                        href="/checkout?plan=starter"
                        className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                    >
                        <span className="relative z-10">Comenzar Gratis</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />

                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Pulsing glow */}
                        <m.div
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 to-orange-500 -z-10"
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ filter: 'blur(25px)' }}
                        />
                    </Link>

                    <Link
                        href="/login?demo=true"
                        className="group inline-flex items-center gap-3 px-8 py-4 bg-white/5 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                        <Play className="w-5 h-5 text-brand-400" />
                        <span>Ver Demo en Vivo</span>
                    </Link>
                </m.div>

                {/* Micro-conversion Text */}
                <m.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-zinc-500 mb-12"
                >
                    <Check className="w-4 h-4 inline mr-1 text-emerald-500" />
                    14 días gratis • Sin tarjeta requerida • Configura en 5 minutos
                </m.p>

                {/* Trust Badges */}
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-wrap justify-center items-center gap-4 md:gap-6"
                >
                    {[
                        { icon: Shield, text: "CFDI 4.0 SAT", color: "text-emerald-400" },
                        { icon: CreditCard, text: "Pagos Seguros", color: "text-blue-400" },
                        { icon: Clock, text: "Setup 5 min", color: "text-purple-400" },
                        { icon: Globe, text: "99.9% Uptime", color: "text-cyan-400" },
                    ].map(({ icon: Icon, text, color }) => (
                        <m.div
                            key={text}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm"
                            whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.2)' }}
                        >
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-sm text-zinc-300 font-medium">{text}</span>
                        </m.div>
                    ))}
                </m.div>
            </div>

            {/* 3D Dashboard Preview */}
            <m.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 hidden md:block"
            >
                <m.div
                    className="relative"
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: 10 }}
                    transition={{ duration: 1, delay: 1 }}
                    style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                >
                    {/* Gradient fade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-10 pointer-events-none" />

                    {/* Browser Chrome */}
                    <div className="rounded-t-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/50 shadow-2xl shadow-brand-500/5 p-2">
                        <div className="bg-zinc-900 rounded-t-xl overflow-hidden">
                            {/* Browser Header */}
                            <div className="h-10 bg-zinc-800/80 flex items-center px-4 gap-3 border-b border-zinc-700/50">
                                <div className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-4 py-1 bg-zinc-700/50 rounded-md text-zinc-400 text-xs">
                                        app.restonext.me/dashboard
                                    </div>
                                </div>
                            </div>

                            {/* Mock Dashboard Content */}
                            <div className="h-56 bg-zinc-950 p-4">
                                <div className="grid grid-cols-4 gap-4 h-full">
                                    {/* Stats cards */}
                                    <m.div
                                        className="col-span-1 bg-gradient-to-br from-brand-600/20 to-brand-700/10 rounded-xl border border-brand-500/20 p-4 flex flex-col justify-between"
                                        animate={{ opacity: [0.7, 1, 0.7] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        <div className="text-xs text-zinc-400">Ventas Hoy</div>
                                        <div className="text-2xl font-bold text-white">
                                            <LiveCounter value="$24,850" />
                                        </div>
                                        <div className="text-xs text-emerald-400">↑ 12% vs ayer</div>
                                    </m.div>

                                    {/* Main chart area */}
                                    <div className="col-span-2 bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs text-zinc-400">Ventas por hora</span>
                                            <span className="text-xs text-brand-400">En vivo</span>
                                        </div>
                                        {/* Mini chart visualization */}
                                        <div className="flex items-end gap-1 h-20">
                                            {[40, 65, 45, 80, 60, 90, 75, 55, 85, 70, 95, 80].map((h, i) => (
                                                <m.div
                                                    key={i}
                                                    className="flex-1 bg-gradient-to-t from-brand-600 to-brand-400 rounded-t"
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.05 + 1.2 }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alerts/Notifications */}
                                    <m.div
                                        className="col-span-1 bg-zinc-900/50 rounded-xl border border-zinc-800 p-3 space-y-2"
                                        animate={{ opacity: [0.6, 1, 0.6] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    >
                                        <div className="text-xs text-zinc-400 mb-2">Alertas IA</div>
                                        <div className="text-xs p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300">
                                            ⚠️ Stock bajo: Cilantro
                                        </div>
                                        <div className="text-xs p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-300">
                                            ✓ Predicción: +25% tacos
                                        </div>
                                    </m.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </m.div>
            </m.div>
        </section>
    );
}
