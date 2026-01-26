"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, ChefHat, Receipt, QrCode,
    Sparkles, Package, BarChart3, Settings,
    Users, Calendar, CreditCard, ArrowRight, Loader2, Coffee
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
                        // Use trade_name (from onboarding) if available, fallback to name
                        setTenantName(tenantData.trade_name || tenantData.name || "Mi Restaurante");
                    } else {
                        setTenantName("Mi Restaurante");
                    }
                } catch {
                    // Tenant fetch failed, use default
                    setTenantName("Mi Restaurante");
                }

                // Fetch KDS config to determine mode
                try {
                    const kdsConfig = await kdsApi.getConfig();
                    setKdsMode(kdsConfig.mode || 'restaurant');
                } catch {
                    // KDS config fetch failed, use default restaurant mode
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
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-brand-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-white"
                        >
                            ¡Bienvenido, {userName}!
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-zinc-400 mt-1"
                        >
                            {tenantName} • Dashboard Principal
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <Link
                            href="/settings/billing"
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span className="hidden sm:inline">Plan</span>
                        </Link>
                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Config</span>
                        </Link>
                    </motion.div>
                </div>

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-sm text-zinc-400">Ventas Hoy</p>
                        <p className="text-2xl font-bold text-white mt-1">$0.00</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-sm text-zinc-400">Órdenes</p>
                        <p className="text-2xl font-bold text-white mt-1">0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-sm text-zinc-400">Mesas Ocupadas</p>
                        <p className="text-2xl font-bold text-white mt-1">0 / 0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-sm text-zinc-400">Productos Bajos</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">0</p>
                    </div>
                </motion.div>

                {/* AI Insights Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mb-10"
                >
                    <Link
                        href="/analytics"
                        className="block p-5 rounded-2xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg animate-pulse">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        Predicción IA Activada
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                            Demanda Normal
                                        </span>
                                    </h3>
                                    <p className="text-sm text-zinc-400 mt-0.5">
                                        Prophet + Perplexity analizando tendencias de esta semana
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </motion.div>

                {/* Modules Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-400" />
                        Módulos
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {getModules(kdsMode).map((module, idx) => (
                            <motion.div
                                key={module.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + idx * 0.05 }}
                            >
                                <Link
                                    href={module.href}
                                    className="group block p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                                            <module.icon className="w-6 h-6 text-white" />
                                        </div>
                                        {module.badge && (
                                            <span className="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs font-medium rounded-full">
                                                {module.badge}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                                        {module.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 mt-1">
                                        {module.description}
                                    </p>

                                    <div className="mt-3 flex items-center gap-1 text-sm text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>Abrir</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-brand-600/10 to-orange-600/10 border border-brand-500/20"
                >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-white">¿Primera vez aquí?</h3>
                            <p className="text-sm text-zinc-400 mt-1">
                                Completa la configuración inicial para empezar a vender.
                            </p>
                        </div>
                        <Link
                            href="/onboarding"
                            className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors"
                        >
                            <span>Configurar mi restaurante</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
