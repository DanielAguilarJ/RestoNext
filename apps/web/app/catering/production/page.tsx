'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChefHat,
    Calendar,
    Clock,
    Users,
    Download,
    Printer,
    Filter,
    Search,
    Loader2,
    RefreshCw,
    ArrowLeft,
    FileText,
    Package,
    ClipboardList,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cateringApi, type CalendarEvent, type ProductionSheet } from '@/lib/api';

// ============================================
// Production Lists Page - Vista de listas de producción
// ============================================

interface ProductionEventItem {
    event: CalendarEvent;
    productionSheet?: ProductionSheet;
    loading: boolean;
    error?: string;
}

export default function ProductionListsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<ProductionEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
    const [selectedEvent, setSelectedEvent] = useState<ProductionEventItem | null>(null);

    // Calcular fechas de filtro
    const getFilterDates = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate: Date;
        let endDate: Date;

        switch (dateFilter) {
            case 'today':
                startDate = today;
                endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'week':
                startDate = today;
                endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'month':
                startDate = today;
                endDate = new Date(today);
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            default:
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                endDate = new Date(today.getFullYear() + 1, 11, 31);
        }

        return { startDate, endDate };
    }, [dateFilter]);

    const searchParams = useSearchParams();
    const eventIdParam = searchParams.get('eventId');

    // Cargar eventos
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { startDate, endDate } = getFilterDates();
            const response = await cateringApi.getCalendarEvents(startDate, endDate);

            // Solo eventos confirmados para producción
            const confirmedEvents = response.events.filter(
                (event) => event.status === 'confirmed' || event.status === 'draft'
            );

            const mappedEvents = confirmedEvents.map((event) => ({
                event,
                loading: false,
            }));

            setEvents(mappedEvents);

            // Auto-select event if param exists
            if (eventIdParam) {
                const target = mappedEvents.find(e => e.event.id === eventIdParam);
                if (target) {
                    // We need to trigger loadProductionSheet but we can't call it easily inside mapping
                    // So we just set it as selected and let the effect below handle it or call it here
                    // But `loadProductionSheet` depends on `setEvents` state... 
                    // Let's simpler: just set state here? No, loadProductionSheet is async.
                    // Proper way:
                }
            }

        } catch (err: any) {
            console.error('Error fetching events:', err);
            setError(err.message || 'Error al cargar los eventos');
        } finally {
            setLoading(false);
        }
    }, [getFilterDates, eventIdParam]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Effect to handle deep linking once events are loaded
    useEffect(() => {
        if (eventIdParam && events.length > 0 && !selectedEvent) {
            const target = events.find(e => e.event.id === eventIdParam);
            if (target) {
                setSelectedEvent(target);
                loadProductionSheet(target.event.id);
            }
        }
    }, [eventIdParam, events]);

    // Cargar lista de producción para un evento
    const loadProductionSheet = async (eventId: string) => {
        setEvents((prev) =>
            prev.map((item) =>
                item.event.id === eventId ? { ...item, loading: true, error: undefined } : item
            )
        );

        try {
            const sheet = await cateringApi.getProductionList(eventId);
            setEvents((prev) =>
                prev.map((item) =>
                    item.event.id === eventId
                        ? { ...item, productionSheet: sheet, loading: false }
                        : item
                )
            );

            // Actualizar evento seleccionado si es el mismo
            setSelectedEvent((prev) =>
                prev?.event.id === eventId ? { ...prev, productionSheet: sheet, loading: false } : prev
            );
        } catch (err: any) {
            console.error('Error loading production sheet:', err);
            setEvents((prev) =>
                prev.map((item) =>
                    item.event.id === eventId
                        ? { ...item, loading: false, error: err.message }
                        : item
                )
            );
        }
    };

    // Formatear fecha
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    // Formatear hora
    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filtrar eventos
    const filteredEvents = events.filter((item) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            item.event.title.toLowerCase().includes(search) ||
            item.event.extendedProps.client_name?.toLowerCase().includes(search) ||
            item.event.extendedProps.location?.toLowerCase().includes(search)
        );
    });

    // Abrir PDF de producción
    const openProductionPdf = (eventId: string) => {
        window.open(cateringApi.getProductionSheetPdfUrl(eventId), '_blank');
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
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <ClipboardList className="w-6 h-6 text-amber-500" />
                        </div>
                        Listas de Producción
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        Genera hojas de producción para eventos confirmados
                    </p>
                </div>
                <button
                    onClick={fetchEvents}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 
                        px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
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
                            text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 
                            focus:ring-amber-500/20 outline-none transition"
                    />
                </div>

                {/* Date Filter */}
                <div className="flex gap-2">
                    {[
                        { value: 'today', label: 'Hoy' },
                        { value: 'week', label: 'Esta Semana' },
                        { value: 'month', label: 'Este Mes' },
                        { value: 'all', label: 'Todos' },
                    ].map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setDateFilter(filter.value as typeof dateFilter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${dateFilter === filter.value
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="mt-4 text-amber-500 hover:text-amber-400"
                    >
                        Reintentar
                    </button>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
                    <ChefHat className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                        No hay eventos para producción
                    </h3>
                    <p className="text-neutral-500 mb-4">
                        {searchTerm
                            ? 'No se encontraron eventos con ese criterio'
                            : 'Confirma eventos para generar sus listas de producción'}
                    </p>
                    <Link
                        href="/catering"
                        className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400"
                    >
                        <Calendar className="w-4 h-4" />
                        Ver Calendario
                    </Link>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Events List */}
                    <div className="space-y-4">
                        {filteredEvents.map((item, index) => (
                            <motion.div
                                key={item.event.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => {
                                    setSelectedEvent(item);
                                    if (!item.productionSheet && !item.loading) {
                                        loadProductionSheet(item.event.id);
                                    }
                                }}
                                className={`rounded-xl border bg-neutral-900 p-5 cursor-pointer transition ${selectedEvent?.event.id === item.event.id
                                    ? 'border-amber-500/50 bg-amber-500/5'
                                    : 'border-neutral-800 hover:border-amber-500/30'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-white">
                                                {item.event.title}
                                            </h3>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.event.status === 'confirmed'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-amber-500/10 text-amber-500'
                                                    }`}
                                            >
                                                {item.event.status === 'confirmed' ? 'Confirmado' : 'Borrador'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(item.event.start)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {formatTime(item.event.start)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                {item.event.extendedProps.guest_count} invitados
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openProductionPdf(item.event.id);
                                            }}
                                            className="p-2 rounded-lg bg-neutral-800 text-neutral-400 
                                                hover:bg-amber-500/20 hover:text-amber-500 transition"
                                            title="Descargar PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.print();
                                            }}
                                            className="p-2 rounded-lg bg-neutral-800 text-neutral-400 
                                                hover:bg-amber-500/20 hover:text-amber-500 transition"
                                            title="Imprimir"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Production Status */}
                                {item.productionSheet && (
                                    <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span className="text-neutral-400">
                                            {item.productionSheet.production_list.length} ingredientes en lista
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Production Sheet Detail */}
                    <div className="lg:sticky lg:top-6 h-fit">
                        {selectedEvent ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-neutral-800 bg-gradient-to-r from-amber-500/10 to-transparent">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                Lista de Producción
                                            </h3>
                                            <p className="text-sm text-neutral-400">
                                                {selectedEvent.event.title}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => openProductionPdf(selectedEvent.event.id)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg 
                                                bg-amber-500 text-white text-sm font-medium 
                                                hover:bg-amber-400 transition"
                                        >
                                            <Download className="w-4 h-4" />
                                            PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {selectedEvent.loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                        </div>
                                    ) : selectedEvent.error ? (
                                        <div className="text-center py-8">
                                            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                                            <p className="text-red-400 text-sm">{selectedEvent.error}</p>
                                            <button
                                                onClick={() => loadProductionSheet(selectedEvent.event.id)}
                                                className="mt-2 text-amber-500 text-sm hover:underline"
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    ) : selectedEvent.productionSheet ? (
                                        <div className="space-y-4">
                                            {/* Event Info */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2 text-neutral-400">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(selectedEvent.event.start)}
                                                </div>
                                                <div className="flex items-center gap-2 text-neutral-400">
                                                    <Users className="w-4 h-4" />
                                                    {selectedEvent.productionSheet.guest_count} pax
                                                </div>
                                            </div>

                                            {/* Ingredients List */}
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                                    <Package className="w-4 h-4" />
                                                    Ingredientes Necesarios
                                                </h4>
                                                {selectedEvent.productionSheet.production_list.length > 0 ? (
                                                    <div className="space-y-2 max-h-[400px] overflow-auto">
                                                        {selectedEvent.productionSheet.production_list.map((item, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex items-center justify-between p-3 
                                                                    rounded-lg bg-neutral-800/50"
                                                            >
                                                                <span className="text-white">{item.name}</span>
                                                                <span className="text-amber-500 font-medium">
                                                                    {item.quantity} {item.unit}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : selectedEvent.event.extendedProps.menu_items_count > 0 ? (
                                                    <div className="flex flex-col items-center gap-2 text-center py-4">
                                                        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                                                        <span className="text-amber-500 font-medium">Atención: Recetas no configuradas</span>
                                                        <p className="text-neutral-400 max-w-xs">
                                                            Este evento tiene {selectedEvent.event.extendedProps.menu_items_count} platillos, pero ninguno tiene ingredientes definidos en sus recetas.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-neutral-500 text-sm py-4 text-center">
                                                        No hay ingredientes definidos para este evento.
                                                        Agrega items al menú primero.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <FileText className="w-10 h-10 text-neutral-700 mx-auto mb-2" />
                                            <p className="text-neutral-500 text-sm">
                                                Selecciona para cargar la lista de producción
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
                                <ChefHat className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    Selecciona un Evento
                                </h3>
                                <p className="text-neutral-500">
                                    Haz clic en un evento para ver su lista de producción
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
