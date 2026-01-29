"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, ChefHat, Receipt, QrCode,
    Sparkles, Package, BarChart3, Settings,
    Users, Calendar, CreditCard, ArrowRight, Loader2, Coffee,
    Clock, TrendingUp, DollarSign, ClipboardList
} from "lucide-react";
import { motion } from "framer-motion";
import { kdsApi, analyticsApi, tablesApi, inventoryApi, forecastApi, tenantApi } from "@/lib/api";

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
    {
        title: "Catering",
        description: "Eventos y cotizaciones",
        icon: ChefHat,
        href: "/catering",
        color: "from-rose-500 to-pink-500",
        badge: "PRO",
    },
    {
        title: "Administrar Menú",
        description: "Categorías y productos",
        icon: ClipboardList,
        href: "/admin/menu",
        color: "from-teal-500 to-emerald-500",
        badge: null,
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

interface AIDemandContext {
    demand_multiplier: number;
    analysis_summary: string;
}

// ============================================
// Dashboard Home Page
// ============================================
export default function DashboardHome() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState<string>("");
    const [tenantName, setTenantName] = useState<string>("");
    const [kdsMode, setKdsMode] = useState<'restaurant' | 'cafeteria'>('restaurant');
    const [aiContext, setAiContext] = useState<AIDemandContext | null>(null);

    // Dashboard stats state
    const [stats, setStats] = useState({
        salesToday: "$0.00",
        ordersToday: "0",
        tablesOccupied: "0 / 0",
        stockAlerts: "0",
    });

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
                let tenantCity = "Ciudad de México"; // Default for AI
                try {
                    const tenantData = await tenantApi.get_current_tenant_profile();
                    setTenantName(tenantData.trade_name || tenantData.name || "Mi Restaurante");

                    if (tenantData.fiscal_address && typeof tenantData.fiscal_address === 'object' && 'city' in tenantData.fiscal_address) {
                        tenantCity = (tenantData.fiscal_address as any).city || "Ciudad de México";
                    }
                } catch (e) {
                    console.error("Error fetching tenant info", e);
                    setTenantName("Mi Restaurante");
                }

                // Fetch KDS config to determine mode
                try {
                    const kdsConfig = await kdsApi.getConfig();
                    setKdsMode(kdsConfig.mode || 'restaurant');
                } catch {
                    setKdsMode('restaurant');
                }

                // Fetch real dashboard stats - executed in parallel but safely handled
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 1. KPIs
                const kpisPromise = analyticsApi.getKPIs(today, new Date())
                    .catch(() => ({ total_sales: 0, total_orders: 0 }));

                // 2. Tables
                const tablesPromise = tablesApi.list()
                    .catch(() => []);

                // 3. Inventory Alerts
                const inventoryPromise = inventoryApi.list(true)
                    .catch(() => []);

                // 4. AI Context (Prophet + Perplexity)
                const aiPromise = forecastApi.getDemandContext(tenantCity, today, new Date())
                    .catch(() => null);

                const [kpis, tables, lowStockItems, aiData] = await Promise.all([
                    kpisPromise,
                    tablesPromise,
                    inventoryPromise,
                    aiPromise
                ]);

                // Process Tables
                const occupiedTables = Array.isArray(tables) ? tables.filter((t: any) => t.status === 'occupied').length : 0;
                const totalTables = Array.isArray(tables) ? tables.length : 0;

                // Process Inventory
                const stockAlertsCount = Array.isArray(lowStockItems) ? lowStockItems.length : 0;

                // Set Stats
                setStats({
                    salesToday: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((kpis as any).total_sales || 0),
                    ordersToday: ((kpis as any).total_orders || 0).toString(),
                    tablesOccupied: `${occupiedTables} / ${totalTables}`,
                    stockAlerts: stockAlertsCount.toString(),
                });

                // Set AI Context
                if (aiData) {
                    setAiContext(aiData);
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

    // Helper for AI Demand Badge
    const getDemandBadge = (multiplier: number) => {
        if (multiplier >= 1.2) return { text: "Demanda Alta", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
        if (multiplier <= 0.8) return { text: "Demanda Baja", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
        return { text: "Demanda Normal", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center" aria-label="Cargando dashboard">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden selection:bg-brand-500/30">
            {/* Animated Mesh Gradient Background */}
            <div className="fixed inset-0 z-0" aria-hidden="true">
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
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                            {tenantName} • Dashboard Principal
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/settings/billing"
                            className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800/80 hover:border-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-500/10"
                            aria-label="Ir al plan de facturación"
                        >
                            <CreditCard className="w-4 h-4 group-hover:text-brand-400 transition-colors" aria-hidden="true" />
                            <span className="font-medium">Plan</span>
                        </Link>
                        <Link
                            href="/settings"
                            className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 transition-all"
                            aria-label="Ir a configuración"
                        >
                            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" aria-hidden="true" />
                            <span className="font-medium">Config</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Quick Stats Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12" role="region" aria-label="Estadísticas rápidas">
                    {[
                        { label: "Ventas Hoy", value: stats.salesToday, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "Órdenes", value: stats.ordersToday, icon: Receipt, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { label: "Mesas", value: stats.tablesOccupied, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
                        { label: "Alertas Stock", value: stats.stockAlerts, icon: Package, color: parseInt(stats.stockAlerts) > 0 ? "text-red-400" : "text-orange-400", bg: parseInt(stats.stockAlerts) > 0 ? "bg-red-500/10" : "bg-orange-500/10" },
                    ].map((stat, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 hover:border-zinc-700 transition-colors group ${parseInt(stats.stockAlerts) > 0 && stat.label === "Alertas Stock" ? "border-red-900/30" : ""}`}>
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
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
                        aria-label="Ver reporte de inteligencia artificial"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-blue-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="relative p-6 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-between z-10">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 animate-pulse" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-inner border border-white/20">
                                        <Sparkles className="w-7 h-7 text-white" aria-hidden="true" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3 flex-wrap">
                                        Predicción IA Activada
                                        {aiContext ? (
                                            <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full shadow-sm ${getDemandBadge(aiContext.demand_multiplier).color}`}>
                                                {getDemandBadge(aiContext.demand_multiplier).text}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold rounded-full">
                                                Analizando...
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-zinc-400 mt-1 line-clamp-2 md:line-clamp-1">
                                        {aiContext ? aiContext.analysis_summary : "Prophet + Perplexity están analizando tus tendencias en tiempo real."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-brand-400 font-medium group-hover:bg-brand-500/10 px-4 py-2 rounded-lg transition-colors whitespace-nowrap hidden md:flex">
                                <span>Ver reporte</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Modules Grid */}
                <motion.div variants={itemVariants}>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-400" aria-hidden="true" />
                        Tus Módulos
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="list">
                        {getModules(kdsMode).map((module, idx) => (
                            <Link
                                key={module.title}
                                href={module.href}
                                className="group relative"
                                role="listitem"
                                aria-label={`Ir al módulo ${module.title}`}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="h-full p-6 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800 hover:border-zinc-700 transition-colors relative overflow-hidden"
                                >
                                    {/* Hover Gradient Effect */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} aria-hidden="true" />

                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} p-[1px] shadow-lg group-hover:shadow-${module.color.split('-')[1]}/30 transition-shadow`}>
                                            <div className="w-full h-full rounded-2xl bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center">
                                                <module.icon className="w-7 h-7 text-white" aria-hidden="true" />
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

                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" aria-hidden="true">
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
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden="true" />

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
                                aria-label="Ir al asistente de configuración"
                            >
                                Configurar Restaurante
                                <ArrowRight className="w-5 h-5" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

