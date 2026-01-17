"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    Sparkles,
    UtensilsCrossed,
    BarChart3,
    TrendingUp,
    Users,
    ArrowRight,
    Rocket
} from "lucide-react";

interface DashboardEmptyStateProps {
    title?: string;
    description?: string;
    showPOSButton?: boolean;
}

export function DashboardEmptyState({
    title = "¡Tu Centro de Comando está listo!",
    description = "Aquí verás el pulso de tu restaurante en tiempo real. Haz tu primera venta en el POS para comenzar a ver la magia.",
    showPOSButton = true,
}: DashboardEmptyStateProps) {
    const features = [
        {
            icon: BarChart3,
            label: "Ventas en vivo",
            color: "text-emerald-500",
            bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
        },
        {
            icon: TrendingUp,
            label: "Tendencias",
            color: "text-blue-500",
            bgColor: "bg-blue-100 dark:bg-blue-900/30"
        },
        {
            icon: Users,
            label: "Ocupación",
            color: "text-purple-500",
            bgColor: "bg-purple-100 dark:bg-purple-900/30"
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative flex flex-col items-center justify-center py-16 px-6"
        >
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-brand-500/10 via-brand-500/5 to-transparent blur-3xl" />
            </div>

            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative mb-8"
            >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/30">
                    <Rocket className="w-12 h-12 text-white" />
                </div>

                {/* Sparkle animations */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-2 -right-2"
                >
                    <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>

                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                    }}
                    className="absolute -bottom-1 -left-3"
                >
                    <Sparkles className="w-5 h-5 text-purple-400" />
                </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-3"
            >
                {title}
            </motion.h2>

            {/* Description */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8"
            >
                {description}
            </motion.p>

            {/* Feature Pills */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-3 mb-10"
            >
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full ${feature.bgColor}`}
                    >
                        <feature.icon className={`w-4 h-4 ${feature.color}`} />
                        <span className={`text-sm font-medium ${feature.color}`}>
                            {feature.label}
                        </span>
                    </motion.div>
                ))}
            </motion.div>

            {/* CTA Button */}
            {showPOSButton && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Link
                        href="/pos"
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-2xl shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105"
                    >
                        <UtensilsCrossed className="w-5 h-5" />
                        <span>Ir al POS</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />

                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </motion.div>
            )}

            {/* Help text */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center"
            >
                💡 Tip: Todas las métricas se actualizan automáticamente en tiempo real
            </motion.p>
        </motion.div>
    );
}

// ============================================
// Widget-specific Empty States
// ============================================

interface WidgetEmptyStateProps {
    icon?: React.ElementType;
    message?: string;
    size?: 'sm' | 'md';
}

export function WidgetEmptyState({
    icon: Icon = BarChart3,
    message = "Sin datos para este período",
    size = 'md'
}: WidgetEmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center ${size === 'sm' ? 'py-6' : 'py-12'}`}>
            <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 mb-3 ${size === 'sm' ? 'p-2' : 'p-3'}`}>
                <Icon className={`text-gray-400 dark:text-gray-500 ${size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'}`} />
            </div>
            <p className={`text-gray-500 dark:text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {message}
            </p>
        </div>
    );
}

// ============================================
// Error State
// ============================================

interface DashboardErrorStateProps {
    error?: Error | null;
    onRetry?: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6"
        >
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error al cargar datos
            </h3>

            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                {error?.message || "Hubo un problema al cargar la información del dashboard."}
            </p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                    Reintentar
                </button>
            )}
        </motion.div>
    );
}
