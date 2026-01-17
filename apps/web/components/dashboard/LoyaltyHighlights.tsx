"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Gift, Cake, Users, TrendingUp, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeletons";
import { WidgetEmptyState } from "./DashboardEmptyState";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/app/analytics/DashboardContext";
import { motion } from "framer-motion";
import Link from "next/link";

// ============================================
// Types
// ============================================

interface TopCustomer {
    id: string;
    name: string;
    level: 'Platino' | 'Oro' | 'Plata' | 'Bronce';
    visits: number;
    spent: number;
    avatar?: string;
}

interface BirthdayCustomer {
    id: string;
    name: string;
    avatar?: string;
}

interface LoyaltyData {
    topCustomers: TopCustomer[];
    birthdaysToday: BirthdayCustomer[];
    totalActiveMembers: number;
    membershipGrowth: number;
}

// ============================================
// Mock Data Generator (Replace with real API)
// ============================================

async function fetchLoyaltyData(): Promise<LoyaltyData> {
    // TODO: Replace with actual API call when loyalty endpoints are available
    // For now, return realistic mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    return {
        topCustomers: [
            { id: '1', name: 'Roberto Gómez', level: 'Platino', visits: 12, spent: 4500 },
            { id: '2', name: 'Ana Martínez', level: 'Oro', visits: 8, spent: 2800 },
            { id: '3', name: 'Carlos Ruiz', level: 'Oro', visits: 7, spent: 2450 },
        ],
        birthdaysToday: [
            { id: 'b1', name: 'María López' },
            { id: 'b2', name: 'Juan García' },
            { id: 'b3', name: 'Sofia Hernández' },
        ],
        totalActiveMembers: 156,
        membershipGrowth: 12.5,
    };
}

// ============================================
// Hook for Loyalty Data
// ============================================

function useLoyaltyData() {
    const query = useQuery({
        queryKey: ['loyalty', 'highlights'],
        queryFn: fetchLoyaltyData,
        staleTime: 5 * 60 * 1000, // 5 minutes
        placeholderData: (prev) => prev,
    });

    const isDayZero = query.data?.topCustomers.length === 0;

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        isDayZero,
        refetch: query.refetch,
    };
}

// ============================================
// Skeleton Component
// ============================================

function LoyaltySkeleton() {
    return (
        <div className="space-y-4">
            <Card className="shadow-md">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-14" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 shadow-none animate-pulse">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="w-8 h-8 rounded-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// Level Badge Colors
// ============================================

const levelColors = {
    Platino: 'from-gray-300 via-gray-400 to-gray-500',
    Oro: 'from-yellow-400 via-amber-500 to-yellow-600',
    Plata: 'from-gray-200 via-gray-300 to-gray-400',
    Bronce: 'from-orange-300 via-orange-400 to-orange-500',
};

// ============================================
// Main Component
// ============================================

interface LoyaltyHighlightsProps {
    className?: string;
}

export function LoyaltyHighlights({ className }: LoyaltyHighlightsProps) {
    const { data, isLoading, error, isDayZero } = useLoyaltyData();

    // Loading State
    if (isLoading) {
        return <LoyaltySkeleton />;
    }

    // Error State
    if (error) {
        return (
            <Card className="shadow-md">
                <CardContent className="py-8">
                    <WidgetEmptyState
                        icon={Trophy}
                        message="Error al cargar programa de lealtad"
                        size="sm"
                    />
                </CardContent>
            </Card>
        );
    }

    // Day Zero State
    if (isDayZero || !data) {
        return (
            <div className={`space-y-4 ${className}`}>
                <Card className="shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            Top Clientes (Mes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-3">
                                <Users className="w-5 h-5 text-yellow-500" />
                            </div>
                            <p className="text-sm text-gray-500">
                                Aún no hay clientes registrados
                            </p>
                            <Link
                                href="/customers"
                                className="text-xs text-brand-600 hover:underline mt-2"
                            >
                                Configurar programa de lealtad →
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
        }).format(value);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* VIP Customers */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            Top Clientes (Mes)
                        </CardTitle>
                        {data.membershipGrowth > 0 && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                                <TrendingUp className="h-3 w-3" />
                                +{data.membershipGrowth}%
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.topCustomers.map((customer, index) => (
                            <motion.div
                                key={customer.id}
                                className="flex items-center justify-between group cursor-pointer"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ x: 4 }}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Rank & Avatar */}
                                    <div className="relative">
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${levelColors[customer.level]} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                            {customer.name.charAt(0)}
                                        </div>
                                        {index < 3 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                                                <span className="text-[10px]">
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <p className="text-sm font-medium leading-none group-hover:text-brand-600 transition-colors">
                                            {customer.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-400" />
                                            {customer.level} • {customer.visits} visitas
                                        </p>
                                    </div>
                                </div>

                                {/* Spent Amount */}
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {formatCurrency(customer.spent)}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Members Count */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Total miembros activos
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {data.totalActiveMembers}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Birthdays */}
            {data.birthdaysToday.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/10 border-purple-100 dark:border-purple-900/20 shadow-none hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-3">
                                <motion.div
                                    className="p-2 bg-white dark:bg-purple-900/30 rounded-full shadow-sm"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 3
                                    }}
                                >
                                    <Cake className="h-5 w-5 text-purple-500" />
                                </motion.div>
                                <div>
                                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                                        Cumpleaños Hoy 🎉
                                    </p>
                                    <p className="text-xs text-purple-700 dark:text-purple-300">
                                        {data.birthdaysToday.length} clientes celebran hoy
                                    </p>
                                </div>
                            </div>

                            {/* Avatar Stack */}
                            <div className="flex -space-x-2 overflow-hidden">
                                {data.birthdaysToday.slice(0, 4).map((customer, i) => (
                                    <motion.div
                                        key={customer.id}
                                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.1 }}
                                        title={customer.name}
                                    >
                                        {customer.name.charAt(0)}
                                    </motion.div>
                                ))}
                                {data.birthdaysToday.length > 4 && (
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-xs text-gray-500 ring-2 ring-white font-medium">
                                        +{data.birthdaysToday.length - 4}
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <button className="w-full mt-4 py-2 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-white/50 border border-purple-200 rounded-lg transition-colors flex items-center justify-center gap-2 bg-white/30">
                                <Gift className="h-4 w-4" />
                                Enviar Promoción
                            </button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
