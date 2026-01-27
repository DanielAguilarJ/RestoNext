"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, ChefHat, Receipt, QrCode,
    Sparkles, Package, BarChart3, Settings,
    Users, Calendar, CreditCard, ArrowRight, Loader2, Coffee,
    Clock, TrendingUp, DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { kdsApi } from "@/lib/api";

// ============================================
// Dashboard Modules (base config)
// ============================================
const getModules = (kdsMode: 'restaurant' | 'cafeteria') => [
    {
        title: "Punto de Venta",
        description: "Toma pedidos y gestiona mesas",
        icon: UtensilsCrossed,
        href: "/pos",
        color: "from-brand-500 to-orange-500",
        badge: null,
    },
    {
        title: "Kitchen Display",
        description: "Pantalla para cocina",
        icon: ChefHat,
        href: "/kitchen",
        color: "from-orange-500 to-red-500",
        badge: null,
    },
    {
        title: "Inventario",
        description: "Control de stock y costos",
        icon: Package,
        href: "/inventory",
        color: "from-emerald-500 to-teal-500",
        badge: null,
    },
    {
        title: "Analytics",
        description: "Reportes y métricas",
        icon: BarChart3,
        href: "/analytics",
        color: "from-blue-500 to-cyan-500",
        badge: null,
    },
    // Dynamic cashier based on mode
    kdsMode === 'cafeteria'
        ? {
            title: "Caja Cafetería",
            description: "Cobro y envío a cocina",
            icon: Coffee,
            href: "/cashier/cafeteria",
            color: "from-amber-500 to-orange-500",
            badge: "CAFÉ",
        }
        : {
            title: "Cajero",
            description: "Cierre de caja y pagos",
            icon: Receipt,
            href: "/cashier",
            color: "from-purple-500 to-pink-500",
            badge: null,
        },
    {
        title: "Self-Service",
        description: "Menú QR para clientes",
        icon: QrCode,
        href: "/admin/qr-menu",
        color: "from-violet-500 to-purple-500",
        badge: "PRO",
    },
    {
        title: "Clientes",
        description: "CRM y programa de lealtad",
        icon: Users,
        href: "/customers",
        color: "from-pink-500 to-rose-500",
        badge: "PRO",
    },
    {
        title: "Reservaciones",
        description: "Gestión de reservas",
        icon: Calendar,
        href: "/reservations",
        color: "from-amber-500 to-orange-500",
        badge: "PRO",
    },
];

// ============================================
// Animation Variants
// ============================================
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

// ============================================
// Dashboard Home Page
// ============================================
export default function DashboardHome() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState<string>("");
    const [tenantName, setTenantName] = useState<string>("");
    const [kdsMode, setKdsMode] = useState<'restaurant' | 'cafeteria'>('restaurant');

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem("access_token");

        if (!token) {
            router.push("/login");
            return;
        }

        // Fetch user data and tenant info
        async function fetchUserData() {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://restonext.me/api";

                // Fetch user info
                const userResponse = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!userResponse.ok) {
                    throw new Error("Authentication failed");
                }

                const userData = await userResponse.json();
                setUserName(userData.name || userData.email || "Usuario");

                // Fetch tenant info (includes trade_name from onboarding)
                try {
                    const tenantResponse = await fetch(`${API_URL}/tenant/me`, {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        },
                    });

                    if (tenantResponse.ok) {
                        const tenantData = await tenantResponse.json();
                        setTenantName(tenantData.trade_name || tenantData.name || "Mi Restaurante");
                    } else {
                        setTenantName("Mi Restaurante");
                    }
                } catch {
                    setTenantName("Mi Restaurante");
                }

                // Fetch KDS config to determine mode
                try {
                    const kdsConfig = await kdsApi.getConfig();
                    setKdsMode(kdsConfig.mode || 'restaurant');
                } catch {
                    setKdsMode('restaurant');
                }
            } catch (error) {
                console.error("Auth error:", error);
                router.push("/login");
            } finally {
                setIsLoading(false);
            }
        }

        fetchUserData();
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden selection:bg-brand-500/30">
            {/* Animated Mesh Gradient Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"
                />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-10 container mx-auto px-4 py-8 max-w-7xl"
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-400">
                            ¡Hola, {userName}!
                        </h1>
                        <p className="text-zinc-400 text-lg mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {tenantName} • Dashboard Principal
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/settings/billing"
                            className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800/80 hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-500/10"
                        >
                            <CreditCard className="w-4 h-4 group-hover:text-brand-400 transition-colors" />
                            <span className="font-medium">Plan</span>
                        </Link>
                        <Link
                            href="/settings"
                            className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 transition-all"
                        >
                            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                            <span className="font-medium">Config</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Quick Stats Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { label: "Ventas Hoy", value: "$0.00", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "Órdenes", value: "0", icon: Receipt, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { label: "Mesas", value: "0 / 0", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
                        { label: "Alertas Stock", value: "0", icon: Package, color: "text-orange-400", bg: "bg-orange-500/10" },
                    ].map((stat, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 hover:border-zinc-700 transition-colors group">
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* AI Insights Banner - Premium Glass Version */}
                <motion.div variants={itemVariants} className="mb-12">
                    <Link
                        href="/analytics"
                        className="group relative block p-1 rounded-2xl bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-blue-500/20 transition-all duration-300 hover:scale-[1.01]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-blue-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="relative p-6 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-between z-10">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 animate-pulse" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-inner border border-white/20">
                                        <Sparkles className="w-7 h-7 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        Predicción IA Activada
                                        <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full shadow-sm shadow-emerald-500/10">
                                            Demanda Normal
                                        </span>
                                    </h3>
                                    <p className="text-zinc-400 mt-1">
                                        Prophet + Perplexity están analizando tus tendencias en tiempo real.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-brand-400 font-medium group-hover:bg-brand-500/10 px-4 py-2 rounded-lg transition-colors">
                                <span>Ver reporte</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Modules Grid */}
                <motion.div variants={itemVariants}>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-400" />
                        Tus Módulos
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {getModules(kdsMode).map((module, idx) => (
                            <Link
                                key={module.title}
                                href={module.href}
                                className="group relative"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="h-full p-6 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800 hover:border-zinc-700 transition-colors relative overflow-hidden"
                                >
                                    {/* Hover Gradient Effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} p-[1px] shadow-lg group-hover:shadow-${module.color.split('-')[1]}/30 transition-shadow`}>
                                            <div className="w-full h-full rounded-2xl bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center">
                                                <module.icon className="w-7 h-7 text-white" />
                                            </div>
                                        </div>
                                        {module.badge && (
                                            <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg shadow-sm">
                                                {module.badge}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-400 transition-colors">
                                            {module.title}
                                        </h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                            {module.description}
                                        </p>
                                    </div>

                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <ArrowRight className="w-5 h-5 text-zinc-500" />
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Quick Actions Footer */}
                <motion.div variants={itemVariants} className="mt-12">
                    <div className="p-8 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">¿Configuración Incompleta?</h3>
                                <p className="text-zinc-400 mt-2 max-w-md">
                                    Si es tu primera vez, asegúrate de completar el asistente de configuración para activar todas las funciones.
                                </p>
                            </div>
                            <Link
                                href="/onboarding"
                                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 flex items-center gap-2"
                            >
                                Configurar Restaurante
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

