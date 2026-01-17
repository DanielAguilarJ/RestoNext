"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, Activity, RefreshCw } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";
import { useOperationsPulse, formatCurrency, DeltaValue } from "@/hooks/useDashboardData";
import { WidgetEmptyState } from "./DashboardEmptyState";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// Delta Indicator Component
// ============================================

interface DeltaIndicatorProps {
    delta: DeltaValue;
    suffix?: string;
    invertColors?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

function DeltaIndicator({
    delta,
    suffix = "vs ayer",
    invertColors = false,
    size = 'sm'
}: DeltaIndicatorProps) {
    const isPositive = invertColors ? !delta.isPositive : delta.isPositive;

    const Icon = delta.trend === 'up'
        ? TrendingUp
        : delta.trend === 'down'
            ? TrendingDown
            : Minus;

    const colorClass = delta.trend === 'neutral'
        ? 'text-gray-500'
        : isPositive
            ? 'text-emerald-500'
            : 'text-red-500';

    const bgClass = delta.trend === 'neutral'
        ? 'bg-gray-100 dark:bg-gray-800'
        : isPositive
            ? 'bg-emerald-50 dark:bg-emerald-900/20'
            : 'bg-red-50 dark:bg-red-900/20';

    const sizeClasses = {
        sm: 'text-xs py-0.5 px-1.5',
        md: 'text-sm py-1 px-2',
        lg: 'text-base py-1.5 px-3',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium",
                sizeClasses[size],
                bgClass,
                colorClass
            )}
        >
            <Icon className={iconSizes[size]} />
            <span>
                {delta.delta >= 0 ? '+' : ''}{delta.delta.toFixed(1)}%
            </span>
            <span className="text-gray-400 font-normal hidden sm:inline">
                {suffix}
            </span>
        </motion.div>
    );
}

// ============================================
// Skeleton Loader for Pulse Cards
// ============================================

function PulseCardSkeleton() {
    return (
        <Card className="shadow-sm border-l-4 border-l-gray-200 animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="h-[40px] mt-2">
                    <Skeleton className="h-full w-full" />
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// Main Component
// ============================================

interface OperationsPulseProps {
    className?: string;
}

export function OperationsPulse({ className }: OperationsPulseProps) {
    const { data, isLoading, isFetching, error, isDayZero, refetch } = useOperationsPulse();

    // Loading State
    if (isLoading) {
        return (
            <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
                <PulseCardSkeleton />
                <PulseCardSkeleton />
                <PulseCardSkeleton />
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <Card className={cn("col-span-3", className)}>
                <CardContent className="py-8">
                    <WidgetEmptyState
                        message="Error al cargar el pulso de operaciones"
                        size="sm"
                    />
                </CardContent>
            </Card>
        );
    }

    // Day Zero State
    if (isDayZero || !data) {
        return (
            <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
                {[
                    { title: "Ventas (En vivo)", icon: DollarSign, color: "border-l-brand-500", iconColor: "text-brand-500" },
                    { title: "Ocupación", icon: Users, color: "border-l-blue-500", iconColor: "text-blue-500" },
                    { title: "Velocidad Cocina", icon: Activity, color: "border-l-purple-500", iconColor: "text-purple-500" },
                ].map((card) => (
                    <Card key={card.title} className={cn("shadow-sm border-l-4", card.color)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                            <card.icon className={cn("h-4 w-4", card.iconColor)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-300 dark:text-gray-600">--</div>
                            <p className="text-xs text-gray-400 mt-1">Esperando primera venta...</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 relative", className)}>
            {/* Fetching Overlay Indicator */}
            <AnimatePresence>
                {isFetching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-2 right-2 z-10"
                    >
                        <RefreshCw className="h-4 w-4 text-brand-500 animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SALES CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
            >
                <Card className="shadow-sm border-l-4 border-l-brand-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ventas (En vivo)
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-brand-500" />
                    </CardHeader>
                    <CardContent>
                        <motion.div
                            key={data.liveSales.value}
                            initial={{ scale: 1.05, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-2xl font-bold"
                        >
                            {formatCurrency(data.liveSales.value)}
                        </motion.div>

                        <div className="mt-1">
                            <DeltaIndicator delta={data.liveSales} suffix="vs ayer" />
                        </div>

                        <div className="h-[40px] mt-3">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.recentSalesData}>
                                    <defs>
                                        <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#f97316" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        content={() => null}
                                        cursor={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="url(#salesGradient)"
                                        strokeWidth={2.5}
                                        dot={false}
                                        animationDuration={500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* OCCUPANCY CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ocupación
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1">
                            <motion.span
                                key={data.occupancy.percentage}
                                initial={{ scale: 1.05 }}
                                animate={{ scale: 1 }}
                                className="text-2xl font-bold"
                            >
                                {data.occupancy.percentage}%
                            </motion.span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                            {data.occupancy.activeTables} de {data.occupancy.totalTables} mesas activas
                        </p>

                        {/* Occupancy Bar */}
                        <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${data.occupancy.percentage}%` }}
                                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                className={cn(
                                    "h-full rounded-full",
                                    data.occupancy.percentage >= 80
                                        ? "bg-gradient-to-r from-orange-400 to-red-500"
                                        : data.occupancy.percentage >= 50
                                            ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                            : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                                )}
                            />
                        </div>

                        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                            <span>Baja</span>
                            <span>Alta</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* KITCHEN SPEED CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Velocidad Cocina
                        </CardTitle>
                        <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1">
                            <motion.span
                                key={data.kitchenSpeed.averageMinutes}
                                initial={{ scale: 1.05 }}
                                animate={{ scale: 1 }}
                                className="text-2xl font-bold"
                            >
                                {Math.floor(data.kitchenSpeed.averageMinutes)}m
                            </motion.span>
                            <span className="text-lg text-gray-500">
                                {Math.round((data.kitchenSpeed.averageMinutes % 1) * 60)}s
                            </span>
                        </div>

                        {/* Kitchen speed delta */}
                        <div className={cn(
                            "text-xs font-medium flex items-center gap-1 mt-1",
                            data.kitchenSpeed.deltaMinutes <= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            {data.kitchenSpeed.deltaMinutes <= 0 ? (
                                <TrendingDown className="h-3 w-3" />
                            ) : (
                                <TrendingUp className="h-3 w-3" />
                            )}
                            {Math.abs(data.kitchenSpeed.deltaMinutes)}m vs objetivo ({data.kitchenSpeed.targetMinutes}m)
                        </div>

                        {/* Speed gauge */}
                        <div className="mt-3 relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min(100, (data.kitchenSpeed.averageMinutes / data.kitchenSpeed.targetMinutes) * 100)}%`
                                }}
                                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                className={cn(
                                    "h-full rounded-full",
                                    data.kitchenSpeed.averageMinutes <= data.kitchenSpeed.targetMinutes
                                        ? "bg-gradient-to-r from-purple-400 to-purple-600"
                                        : "bg-gradient-to-r from-orange-400 to-red-500"
                                )}
                            />

                            {/* Target marker */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"
                                style={{ left: '100%' }}
                            />
                        </div>

                        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                            <span>Rápido</span>
                            <span>Objetivo</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
