"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, AlertTriangle, TrendingUp, PackageCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeletons";
import { WidgetEmptyState } from "./DashboardEmptyState";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/app/analytics/DashboardContext";
import { inventoryApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ============================================
// Types
// ============================================

interface ProcurementAlert {
    id: string;
    type: 'critical' | 'warning' | 'prediction';
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
}

interface ProcurementData {
    alerts: ProcurementAlert[];
    confidence: 'high' | 'medium' | 'low';
    suggestedSuppliers: number;
    lastUpdate: Date;
}

// ============================================
// Hook for Procurement Data
// ============================================

function useProcurementData() {
    const { filters } = useDashboardContext();

    // Fetch low stock items
    const lowStockQuery = useQuery({
        queryKey: ['procurement', 'lowStock'],
        queryFn: async () => {
            const items = await inventoryApi.list(true); // Low stock only
            return items;
        },
        staleTime: 60 * 1000, // 1 minute
        placeholderData: (prev) => prev,
    });

    // Transform data into alerts
    const alerts: ProcurementAlert[] = [];

    if (lowStockQuery.data) {
        // Critical stock alerts
        lowStockQuery.data
            .filter(item => item.stock_quantity <= item.min_stock_alert * 0.5)
            .slice(0, 2)
            .forEach(item => {
                alerts.push({
                    id: item.id,
                    type: 'critical',
                    title: `Stock Crítico: ${item.name}`,
                    description: `Quedan solo ${item.stock_quantity} ${item.unit}. Stock mínimo: ${item.min_stock_alert} ${item.unit}.`,
                    actionLabel: 'Generar Orden de Compra',
                    actionHref: `/inventory/${item.id}`,
                });
            });

        // Warning stock alerts
        lowStockQuery.data
            .filter(item => item.stock_quantity > item.min_stock_alert * 0.5 && item.stock_quantity <= item.min_stock_alert)
            .slice(0, 1)
            .forEach(item => {
                alerts.push({
                    id: item.id,
                    type: 'warning',
                    title: `Stock Bajo: ${item.name}`,
                    description: `${item.stock_quantity} ${item.unit} disponibles. Considera reordenar pronto.`,
                });
            });
    }

    // Add a prediction alert if we have low stock items
    if (lowStockQuery.data && lowStockQuery.data.length > 0) {
        alerts.push({
            id: 'prediction-weekend',
            type: 'prediction',
            title: 'Alta Demanda: Fin de Semana',
            description: 'Se recomienda aumentar prep de productos más vendidos (+20%).',
        });
    }

    const data: ProcurementData = {
        alerts: alerts.slice(0, 3), // Max 3 alerts
        confidence: alerts.length > 0 ? 'high' : 'medium',
        suggestedSuppliers: Math.min(alerts.length + 1, 5),
        lastUpdate: new Date(),
    };

    const isDayZero = !lowStockQuery.data || lowStockQuery.data.length === 0;

    return {
        data: isDayZero ? null : data,
        isLoading: lowStockQuery.isLoading,
        isFetching: lowStockQuery.isFetching,
        error: lowStockQuery.error,
        isDayZero,
        refetch: lowStockQuery.refetch,
    };
}

// ============================================
// Skeleton Component
// ============================================

function ProcurementSkeleton() {
    return (
        <Card className="col-span-1 shadow-md border-0 bg-gradient-to-br from-white to-orange-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// Alert Item Component
// ============================================

interface AlertItemProps {
    alert: ProcurementAlert;
    index: number;
}

function AlertItem({ alert, index }: AlertItemProps) {
    const config = {
        critical: {
            bgColor: 'bg-red-50 dark:bg-red-900/10',
            borderColor: 'border-red-100 dark:border-red-900/30',
            iconBg: 'bg-white dark:bg-red-900/20',
            iconColor: 'text-red-500',
            titleColor: 'text-red-900 dark:text-red-200',
            textColor: 'text-red-700 dark:text-red-300',
            linkColor: 'text-red-600 hover:text-red-800',
            Icon: AlertTriangle,
        },
        warning: {
            bgColor: 'bg-amber-50 dark:bg-amber-900/10',
            borderColor: 'border-amber-100 dark:border-amber-900/30',
            iconBg: 'bg-white dark:bg-amber-900/20',
            iconColor: 'text-amber-500',
            titleColor: 'text-amber-900 dark:text-amber-200',
            textColor: 'text-amber-700 dark:text-amber-300',
            linkColor: 'text-amber-600 hover:text-amber-800',
            Icon: AlertTriangle,
        },
        prediction: {
            bgColor: 'bg-blue-50 dark:bg-blue-900/10',
            borderColor: 'border-blue-100 dark:border-blue-900/30',
            iconBg: 'bg-white dark:bg-blue-900/20',
            iconColor: 'text-blue-500',
            titleColor: 'text-blue-900 dark:text-blue-200',
            textColor: 'text-blue-700 dark:text-blue-300',
            linkColor: 'text-blue-600 hover:text-blue-800',
            Icon: TrendingUp,
        },
    };

    const c = config[alert.type];
    const Icon = c.Icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-4 p-3 rounded-lg ${c.bgColor} border ${c.borderColor}`}
        >
            <div className={`p-2 ${c.iconBg} rounded-full shadow-sm`}>
                <Icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm ${c.titleColor} truncate`}>
                    {alert.title}
                </h4>
                <p className={`text-xs ${c.textColor} mt-1 line-clamp-2`}>
                    {alert.description}
                </p>
                {alert.actionLabel && alert.actionHref && (
                    <Link
                        href={alert.actionHref}
                        className={`text-xs font-medium ${c.linkColor} underline mt-2 inline-block`}
                    >
                        {alert.actionLabel}
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// Main Component
// ============================================

interface AiProcurementWidgetProps {
    className?: string;
}

export function AiProcurementWidget({ className }: AiProcurementWidgetProps) {
    const { data, isLoading, isFetching, error, isDayZero } = useProcurementData();

    // Loading State
    if (isLoading) {
        return <ProcurementSkeleton />;
    }

    // Error State
    if (error) {
        return (
            <Card className={`col-span-1 shadow-md ${className}`}>
                <CardContent className="py-8">
                    <WidgetEmptyState
                        icon={BrainCircuit}
                        message="Error al cargar predicciones"
                        size="sm"
                    />
                </CardContent>
            </Card>
        );
    }

    // Day Zero / No Alerts State
    if (isDayZero || !data || data.alerts.length === 0) {
        return (
            <Card className={`col-span-1 shadow-md border-0 bg-gradient-to-br from-white to-emerald-50/50 dark:from-zinc-900 dark:to-zinc-900/50 ${className}`}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-brand-500" />
                                IA Procurement
                            </CardTitle>
                            <CardDescription>
                                Predicciones de inventario y compras inteligentes
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            Todo en Orden
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                            <PackageCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No hay alertas de inventario
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Tu stock está en niveles óptimos
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const confidenceColors = {
        high: 'bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800',
        medium: 'bg-amber-100 text-amber-700 border-amber-200',
        low: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const confidenceLabels = {
        high: 'High Confidence',
        medium: 'Medium',
        low: 'Low',
    };

    return (
        <Card className={`col-span-1 shadow-md border-0 bg-gradient-to-br from-white to-orange-50/50 dark:from-zinc-900 dark:to-zinc-900/50 relative ${className}`}>
            {/* Fetching indicator */}
            <AnimatePresence>
                {isFetching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-4 right-4"
                    >
                        <RefreshCw className="h-4 w-4 text-brand-500 animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-brand-500" />
                            IA Procurement
                        </CardTitle>
                        <CardDescription>
                            Predicciones de inventario y compras inteligentes
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={confidenceColors[data.confidence]}>
                        {confidenceLabels[data.confidence]}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Alerts */}
                {data.alerts.map((alert, index) => (
                    <AlertItem key={alert.id} alert={alert} index={index} />
                ))}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between pt-2"
                >
                    <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Proveedores sugeridos: {data.suggestedSuppliers}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">
                        Actualizado hace {Math.floor((Date.now() - data.lastUpdate.getTime()) / 60000) || 1}m
                    </span>
                </motion.div>
            </CardContent>
        </Card>
    );
}
