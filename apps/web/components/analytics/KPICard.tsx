"use client";

/**
 * KPI Card Component
 * Displays a single KPI metric with icon and optional trend indicator
 */

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: ReactNode;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: "purple" | "cyan" | "emerald" | "amber" | "rose";
}

const colorClasses = {
    purple: {
        bg: "from-purple-500/20 to-purple-600/10",
        border: "border-purple-500/30",
        icon: "text-purple-400",
        glow: "shadow-purple-500/20",
    },
    cyan: {
        bg: "from-cyan-500/20 to-cyan-600/10",
        border: "border-cyan-500/30",
        icon: "text-cyan-400",
        glow: "shadow-cyan-500/20",
    },
    emerald: {
        bg: "from-emerald-500/20 to-emerald-600/10",
        border: "border-emerald-500/30",
        icon: "text-emerald-400",
        glow: "shadow-emerald-500/20",
    },
    amber: {
        bg: "from-amber-500/20 to-amber-600/10",
        border: "border-amber-500/30",
        icon: "text-amber-400",
        glow: "shadow-amber-500/20",
    },
    rose: {
        bg: "from-rose-500/20 to-rose-600/10",
        border: "border-rose-500/30",
        icon: "text-rose-400",
        glow: "shadow-rose-500/20",
    },
};

export function KPICard({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    color = "purple",
}: KPICardProps) {
    const colors = colorClasses[color];

    const getTrendIcon = () => {
        switch (trend) {
            case "up":
                return <TrendingUp className="w-4 h-4 text-emerald-400" />;
            case "down":
                return <TrendingDown className="w-4 h-4 text-rose-400" />;
            default:
                return <Minus className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTrendColor = () => {
        switch (trend) {
            case "up":
                return "text-emerald-400";
            case "down":
                return "text-rose-400";
            default:
                return "text-gray-400";
        }
    };

    return (
        <div
            className={`
                relative overflow-hidden rounded-2xl
                bg-gradient-to-br ${colors.bg}
                border ${colors.border}
                backdrop-blur-xl
                p-6
                shadow-lg ${colors.glow}
                hover:shadow-xl hover:scale-[1.02]
                transition-all duration-300
            `}
        >
            {/* Background glow effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 ${colors.icon}`}>
                {icon}
            </div>

            {/* Title */}
            <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>

            {/* Value */}
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white">{value}</h3>
                {trend && trendValue && (
                    <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span className="text-sm font-medium">{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
        </div>
    );
}
