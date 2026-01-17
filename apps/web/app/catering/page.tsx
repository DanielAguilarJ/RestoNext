'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Users, DollarSign, Calendar, Clock,
    TrendingUp, FileText, RefreshCw, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { EventCalendar, type CalendarEvent } from '@/components/catering/EventCalendar';
import { cateringApi } from '@/lib/api';

// ============================================
// Stats Card Component
// ============================================

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'emerald' | 'blue' | 'amber' | 'purple';
    trend?: string;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-neutral-400">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
                    {trend && (
                        <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// Main Catering Page
// ============================================

export default function CateringPage() {
    const router = useRouter();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stats (calculated from events)
    const [stats, setStats] = useState({
        upcomingEvents: 0,
        pendingQuotes: 0,
        projectedRevenue: 0,
        activeLeads: 0,
    });

    // Fetch calendar events
    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await cateringApi.getCalendarEvents();
            setEvents(response.events);

            // Calculate stats
            const now = new Date();
            const upcoming = response.events.filter(e =>
                new Date(e.start) > now && e.status !== 'cancelled'
            );
            const confirmed = response.events.filter(e => e.status === 'confirmed');
            const drafts = response.events.filter(e => e.status === 'draft');

            const revenue = confirmed.reduce((acc, e) => acc + e.extendedProps.total_amount, 0);

            setStats({
                upcomingEvents: upcoming.length,
                pendingQuotes: drafts.length,
                projectedRevenue: revenue,
                activeLeads: drafts.length, // Simplified for now
            });
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Error al cargar los eventos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    // Handle event actions
    const handleEventAction = (action: 'pdf' | 'production' | 'view', eventId: string) => {
        switch (action) {
            case 'pdf':
                // Open PDF in new tab
                window.open(cateringApi.getProposalPdfUrl(eventId), '_blank');
                break;
            case 'production':
                // Open production sheet PDF
                window.open(cateringApi.getProductionSheetPdfUrl(eventId), '_blank');
                break;
            case 'view':
                // Navigate to event details
                router.push(`/catering/events/${eventId}`);
                break;
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Catering & Eventos</h1>
                    <p className="text-neutral-400">
                        Gestiona eventos, propuestas y producción
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="p-2 rounded-lg border border-neutral-700 text-neutral-400 
                            hover:bg-neutral-800 hover:text-white transition disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/catering/events/new')}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 
                            font-medium text-white transition hover:bg-emerald-500"
                    >
                        <Plus className="h-5 w-5" />
                        Nuevo Evento
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Próximos Eventos"
                    value={stats.upcomingEvents}
                    icon={<Calendar className="w-5 h-5" />}
                    color="emerald"
                />
                <StatCard
                    title="Cotizaciones Pendientes"
                    value={stats.pendingQuotes}
                    icon={<FileText className="w-5 h-5" />}
                    color="amber"
                />
                <StatCard
                    title="Ingresos Proyectados"
                    value={formatCurrency(stats.projectedRevenue)}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    title="Leads Activos"
                    value={stats.activeLeads}
                    icon={<Users className="w-5 h-5" />}
                    color="purple"
                    trend="+12% este mes"
                />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => router.push('/catering/leads')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700
                        text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                >
                    <Users className="w-4 h-4" />
                    Ver Leads
                </button>
                <button
                    onClick={() => router.push('/catering/events')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700
                        text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                >
                    <Calendar className="w-4 h-4" />
                    Todos los Eventos
                </button>
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={fetchEvents}
                            className="text-emerald-500 hover:text-emerald-400"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : (
                    <EventCalendar
                        events={events}
                        onEventClick={(event) => console.log('Event clicked:', event)}
                        onDateSelect={(date) => console.log('Date selected:', date)}
                        onEventAction={handleEventAction}
                        isLoading={loading}
                    />
                )}
            </div>
        </div>
    );
}
