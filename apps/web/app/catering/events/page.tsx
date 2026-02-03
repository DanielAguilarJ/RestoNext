'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Calendar,
    Users,
    MapPin,
    ArrowLeft,
    Loader2,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Download,
    ChefHat,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cateringApi, type CateringEvent } from '@/lib/api';

// ============================================
// Events List Page
// ============================================

export default function EventsListPage() {
    const router = useRouter();
    const [events, setEvents] = useState<CateringEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Fetch events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await cateringApi.getEvents();
                setEvents(data);
            } catch (err: any) {
                console.error('Error fetching events:', err);
                setError(err.message || 'Error al cargar los eventos');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Filter events
    const filteredEvents = events.filter((event) => {
        const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.location?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Format time
    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Status styling
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
            case 'draft':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
            case 'cancelled':
                return 'bg-red-500/10 text-red-500 border-red-500/30';
            case 'completed':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
            default:
                return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: 'Borrador',
            confirmed: 'Confirmado',
            cancelled: 'Cancelado',
            completed: 'Completado',
        };
        return labels[status] || status;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/catering"
                        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Calendario
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Todos los Eventos</h1>
                    <p className="text-neutral-400">
                        {events.length} eventos en total
                    </p>
                </div>
                <button
                    onClick={() => router.push('/catering/events/new')}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 
                        font-medium text-white transition hover:bg-emerald-500"
                >
                    <Plus className="h-5 w-5" />
                    Nuevo Evento
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar eventos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 
                            text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 
                            focus:ring-emerald-500/20 outline-none transition"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 
                        text-white focus:border-emerald-500 outline-none transition min-w-[150px]"
                >
                    <option value="all">Todos los estados</option>
                    <option value="draft">Borrador</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
            </div>

            {/* Content */}
            {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
                    <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                        {searchTerm || statusFilter !== 'all'
                            ? 'No se encontraron eventos'
                            : 'No hay eventos todavía'
                        }
                    </h3>
                    <p className="text-neutral-500 mb-4">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Intenta con otros filtros'
                            : 'Crea tu primer evento de catering'
                        }
                    </p>
                    {!searchTerm && statusFilter === 'all' && (
                        <button
                            onClick={() => router.push('/catering/events/new')}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                            Crear Evento
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredEvents.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 
                                hover:border-emerald-500/50 transition cursor-pointer group"
                            onClick={() => router.push(`/catering/events/${event.id}`)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                                            {event.name}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(event.status)}`}>
                                            {getStatusLabel(event.status)}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(event.start_time)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                {event.location}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4" />
                                            {event.guest_count} invitados
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-xl font-bold text-emerald-500">
                                        {formatCurrency(event.total_amount)}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {event.menu_selections?.length || 0} items
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
