"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2, AlertCircle, Users, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeletons";
import { WidgetEmptyState } from "./DashboardEmptyState";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";

// ============================================
// Types
// ============================================

interface CateringEvent {
    id: string;
    title: string;
    date: Date;
    time: string;
    guestCount: number;
    status: 'confirmed' | 'pending_payment' | 'pending_confirmation' | 'cancelled';
    totalAmount?: number;
}

interface CateringData {
    upcomingEvents: CateringEvent[];
    pendingQuotes: number;
    confirmedThisMonth: number;
    totalRevenue: number;
}

// ============================================
// Mock Data Generator (Replace with real API)
// ============================================

async function fetchCateringData(): Promise<CateringData> {
    // TODO: Replace with actual API call when catering endpoints are available
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay

    const today = new Date();

    return {
        upcomingEvents: [
            {
                id: '1',
                title: 'Boda Civil - Familia González',
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8),
                time: '14:00',
                guestCount: 50,
                status: 'confirmed',
                totalAmount: 45000,
            },
            {
                id: '2',
                title: 'Cena Corporativa - TechSol',
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12),
                time: '19:30',
                guestCount: 25,
                status: 'pending_payment',
                totalAmount: 18500,
            },
        ],
        pendingQuotes: 3,
        confirmedThisMonth: 5,
        totalRevenue: 125000,
    };
}

// ============================================
// Hook for Catering Data
// ============================================

function useCateringData() {
    const query = useQuery({
        queryKey: ['catering', 'overview'],
        queryFn: fetchCateringData,
        staleTime: 2 * 60 * 1000, // 2 minutes
        placeholderData: (prev) => prev,
    });

    const isDayZero = query.data?.upcomingEvents.length === 0 && query.data?.pendingQuotes === 0;

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

function CateringSkeleton() {
    return (
        <Card className="col-span-1 shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center justify-between gap-3 pb-3 border-b last:border-0">
                            <div className="flex items-start gap-3">
                                <Skeleton className="w-12 h-12 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
    status: CateringEvent['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        confirmed: {
            className: 'bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-none',
            label: 'Confirmado',
            icon: CheckCircle2,
        },
        pending_payment: {
            className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
            label: 'Pendiente Pago',
            icon: AlertCircle,
        },
        pending_confirmation: {
            className: 'text-blue-600 border-blue-200 bg-blue-50',
            label: 'Por Confirmar',
            icon: Clock,
        },
        cancelled: {
            className: 'text-red-600 border-red-200 bg-red-50',
            label: 'Cancelado',
            icon: AlertCircle,
        },
    };

    const c = config[status];
    const Icon = c.icon;

    return (
        <Badge className={`w-fit flex items-center gap-1 ${c.className}`} variant="outline">
            <Icon className="h-3 w-3" />
            {c.label}
        </Badge>
    );
}

// ============================================
// Event Card Component
// ============================================

interface EventCardProps {
    event: CateringEvent;
    index: number;
}

function EventCard({ event, index }: EventCardProps) {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const month = monthNames[event.date.getMonth()];
    const day = event.date.getDate();

    const isUpcoming = event.date.getTime() > Date.now();
    const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const dateColors = event.status === 'confirmed'
        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0 group"
        >
            <div className="flex items-start gap-3">
                {/* Date Badge */}
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${dateColors}`}>
                    <span className="text-xs font-bold uppercase">{month}</span>
                    <span className="text-lg font-bold">{day}</span>
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate group-hover:text-brand-600 transition-colors">
                        {event.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.guestCount} Pax
                        </span>
                        {isUpcoming && daysUntil <= 7 && (
                            <span className="text-orange-600 font-medium">
                                En {daysUntil} día{daysUntil !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Status */}
            <StatusBadge status={event.status} />
        </motion.div>
    );
}

// ============================================
// Main Component
// ============================================

interface CateringOverviewProps {
    className?: string;
}

export function CateringOverview({ className }: CateringOverviewProps) {
    const { data, isLoading, error, isDayZero } = useCateringData();

    // Loading State
    if (isLoading) {
        return <CateringSkeleton />;
    }

    // Error State
    if (error) {
        return (
            <Card className={`col-span-1 shadow-md ${className}`}>
                <CardContent className="py-8">
                    <WidgetEmptyState
                        icon={CalendarDays}
                        message="Error al cargar eventos"
                        size="sm"
                    />
                </CardContent>
            </Card>
        );
    }

    // Day Zero State
    if (isDayZero || !data) {
        return (
            <Card className={`col-span-1 shadow-md ${className}`}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-brand-600" />
                                Catering & Eventos
                            </CardTitle>
                            <CardDescription>Próximos eventos y cotizaciones</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                            <CalendarDays className="w-6 h-6 text-purple-500" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No hay eventos programados
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Crea tu primera cotización de catering
                        </p>
                        <button className="mt-4 px-4 py-2 text-sm text-center text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium border border-dashed border-brand-200 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Nueva Cotización
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`col-span-1 shadow-md hover:shadow-lg transition-shadow ${className}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-brand-600" />
                            Catering & Eventos
                        </CardTitle>
                        <CardDescription>Próximos eventos y estado de cotizaciones</CardDescription>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {data.pendingQuotes} Pendientes
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-4">
                    {/* Events List */}
                    {data.upcomingEvents.map((event, index) => (
                        <EventCard key={event.id} event={event} index={index} />
                    ))}

                    {/* Stats Summary */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800"
                    >
                        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {data.confirmedThisMonth}
                            </p>
                            <p className="text-xs text-gray-500">Confirmados este mes</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                            <p className="text-lg font-bold text-emerald-600">
                                ${(data.totalRevenue / 1000).toFixed(0)}k
                            </p>
                            <p className="text-xs text-gray-500">Ingresos eventos</p>
                        </div>
                    </motion.div>

                    {/* Action Button */}
                    <button className="w-full mt-2 py-2.5 text-sm text-center text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10 rounded-lg transition-colors font-medium border border-dashed border-brand-200 dark:border-brand-800 flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Cotización
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
