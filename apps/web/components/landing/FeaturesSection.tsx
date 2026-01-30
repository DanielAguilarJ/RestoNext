"use client";

import { m } from "framer-motion";
import { UtensilsCrossed, ChefHat, Package, FileText, QrCode, BarChart3, Zap, ArrowRight } from "lucide-react";
import Image from "next/image";

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
        image: "/feature-pos.png",
    },
    {
        icon: ChefHat,
        title: "Kitchen Display (KDS)",
        description: "Pantalla en cocina con tiempos de preparación, prioridades y notificaciones en tiempo real.",
        color: "from-orange-500 to-red-500",
        gradient: "from-orange-500/20 to-red-500/10",
        image: "/feature-kds.png",
    },
    {
        icon: Package,
        title: "Inventario con IA",
        description: "Controla stock, mermas y costos. Predicción de compras con Machine Learning.",
        color: "from-emerald-500 to-teal-500",
        gradient: "from-emerald-500/20 to-teal-500/10",
        image: "/feature-inventory.png",
    },
    {
        icon: FileText,
        title: "Facturación CFDI 4.0",
        description: "Genera facturas electrónicas válidas ante el SAT con un clic. Cancelación automática.",
        color: "from-purple-500 to-pink-500",
        gradient: "from-purple-500/20 to-pink-500/10",
        image: "/feature-cfdi.png",
    },
    {
        icon: QrCode,
        title: "Menú Digital QR",
        description: "Comensales ordenan desde su celular. Sin fricciones, sin esperas.",
        color: "from-violet-500 to-purple-500",
        gradient: "from-violet-500/20 to-purple-500/10",
        image: "/feature-qr.png",
    },
    {
        icon: BarChart3,
        title: "Analytics Avanzado",
        description: "Dashboards en tiempo real, reportes de ventas, productos más vendidos y predicciones.",
        color: "from-amber-500 to-orange-500",
        gradient: "from-amber-500/20 to-orange-500/10",
        image: "/feature-analytics.png",
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-zinc-950 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-brand-500/5 to-transparent rounded-full" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <m.div
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
                </m.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <m.div
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

                            {/* Image Header */}
                            <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent z-10" />
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} mix-blend-overlay opacity-60`} />
                                {/* @ts-ignore */}
                                {feature.image && (
                                    <Image
                                        src={feature.image}
                                        alt={feature.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                {/* Icon */}
                                <m.div
                                    className={`absolute -top-12 right-0 inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg border-4 border-zinc-900`}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                >
                                    <feature.icon className="w-6 h-6 text-white" />
                                </m.div>

                                {/* Title & Description */}
                                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-zinc-400 leading-relaxed text-sm">
                                    {feature.description}
                                </p>

                                {/* Learn more link */}
                                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                    <span>Saber más</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </m.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
