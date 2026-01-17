'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Users, MapPin, DollarSign, Clock, X,
    FileText, Download, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    status: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        guest_count: number;
        location: string | null;
        client_name: string;
        total_amount: number;
    };
}

interface EventCalendarProps {
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onDateSelect?: (date: Date) => void;
    onEventAction?: (action: 'pdf' | 'production' | 'view', eventId: string) => void;
    isLoading?: boolean;
}

type ViewMode = 'month' | 'week';

// ============================================
// Status Configuration
// ============================================

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Borrador', color: '#6B7280', bg: 'bg-neutral-100' },
    confirmed: { label: 'Confirmado', color: '#10B981', bg: 'bg-emerald-100' },
    in_progress: { label: 'En Progreso', color: '#3B82F6', bg: 'bg-blue-100' },
    completed: { label: 'Completado', color: '#8B5CF6', bg: 'bg-purple-100' },
    cancelled: { label: 'Cancelado', color: '#EF4444', bg: 'bg-red-100' },
};

// ============================================
// Helper Functions
// ============================================

function getDaysInMonth(year: number, month: number): Date[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add days from previous month to start on Sunday
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
        days.push(new Date(year, month, -i));
    }

    // Add all days in current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        days.push(new Date(year, month, day));
    }

    // Add days from next month to complete the grid
    const endDay = lastDay.getDay();
    for (let i = 1; i < 7 - endDay; i++) {
        days.push(new Date(year, month + 1, i));
    }

    return days;
}

function getWeekDays(date: Date): Date[] {
    const days: Date[] = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
    }

    return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
}

// ============================================
// Event Details Modal
// ============================================

interface EventModalProps {
    event: CalendarEvent | null;
    onClose: () => void;
    onAction?: (action: 'pdf' | 'production' | 'view', eventId: string) => void;
}

function EventDetailsModal({ event, onClose, onAction }: EventModalProps) {
    if (!event) return null;

    const status = statusConfig[event.status] || statusConfig.draft;
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="p-6"
                    style={{ backgroundColor: event.backgroundColor }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2`}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    color: event.color
                                }}
                            >
                                {status.label}
                            </span>
                            <h2 className="text-2xl font-bold text-white">{event.title}</h2>
                            {event.extendedProps.client_name && (
                                <p className="text-white/80 mt-1">
                                    {event.extendedProps.client_name}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-neutral-700">
                        <CalendarIcon className="w-5 h-5 text-neutral-400" />
                        <div>
                            <p className="font-medium">
                                {startDate.toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-700">
                        <Clock className="w-5 h-5 text-neutral-400" />
                        <p>
                            {startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-700">
                        <Users className="w-5 h-5 text-neutral-400" />
                        <p>{event.extendedProps.guest_count} invitados</p>
                    </div>

                    {event.extendedProps.location && (
                        <div className="flex items-center gap-3 text-neutral-700">
                            <MapPin className="w-5 h-5 text-neutral-400" />
                            <p>{event.extendedProps.location}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 text-neutral-700">
                        <DollarSign className="w-5 h-5 text-neutral-400" />
                        <p className="font-bold text-emerald-600 text-lg">
                            {formatCurrency(event.extendedProps.total_amount)}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-neutral-50 border-t border-neutral-200">
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => onAction?.('pdf', event.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl 
                                bg-white border border-neutral-200 hover:border-emerald-300
                                hover:bg-emerald-50 transition text-neutral-700 hover:text-emerald-700"
                        >
                            <Download className="w-5 h-5" />
                            <span className="text-xs font-medium">Propuesta PDF</span>
                        </button>
                        <button
                            onClick={() => onAction?.('production', event.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl 
                                bg-white border border-neutral-200 hover:border-blue-300
                                hover:bg-blue-50 transition text-neutral-700 hover:text-blue-700"
                        >
                            <FileCheck className="w-5 h-5" />
                            <span className="text-xs font-medium">Producción</span>
                        </button>
                        <button
                            onClick={() => onAction?.('view', event.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl 
                                bg-white border border-neutral-200 hover:border-purple-300
                                hover:bg-purple-50 transition text-neutral-700 hover:text-purple-700"
                        >
                            <FileText className="w-5 h-5" />
                            <span className="text-xs font-medium">Ver Detalles</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// Main Calendar Component
// ============================================

export function EventCalendar({
    events,
    onEventClick,
    onDateSelect,
    onEventAction,
    isLoading = false,
}: EventCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const today = new Date();

    // Navigation
    const navigate = useCallback((direction: 'prev' | 'next') => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            if (viewMode === 'month') {
                newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
            } else {
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
            }
            return newDate;
        });
    }, [viewMode]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Get days to display
    const displayDays = useMemo(() => {
        if (viewMode === 'month') {
            return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        }
        return getWeekDays(currentDate);
    }, [currentDate, viewMode]);

    // Get events for a specific day
    const getEventsForDay = useCallback((date: Date): CalendarEvent[] => {
        return events.filter((event) => {
            const eventStart = new Date(event.start);
            return isSameDay(eventStart, date);
        });
    }, [events]);

    // Handle event click
    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        onEventClick?.(event);
    };

    // Header title
    const headerTitle = useMemo(() => {
        const options: Intl.DateTimeFormatOptions = viewMode === 'month'
            ? { month: 'long', year: 'numeric' }
            : { month: 'long', year: 'numeric', day: 'numeric' };

        if (viewMode === 'week') {
            const weekStart = displayDays[0];
            const weekEnd = displayDays[6];
            return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
        }

        return currentDate.toLocaleDateString('es-MX', options);
    }, [currentDate, viewMode, displayDays]);

    // Day names
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-neutral-900 capitalize">
                        {headerTitle}
                    </h2>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-sm font-medium text-neutral-600 
                            bg-neutral-100 rounded-lg hover:bg-neutral-200 transition"
                    >
                        Hoy
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-sm font-medium transition ${viewMode === 'month'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            Mes
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-sm font-medium transition ${viewMode === 'week'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            Semana
                        </button>
                    </div>

                    {/* Navigation */}
                    <button
                        onClick={() => navigate('prev')}
                        className="p-2 rounded-lg hover:bg-neutral-100 transition"
                    >
                        <ChevronLeft className="w-5 h-5 text-neutral-600" />
                    </button>
                    <button
                        onClick={() => navigate('next')}
                        className="p-2 rounded-lg hover:bg-neutral-100 transition"
                    >
                        <ChevronRight className="w-5 h-5 text-neutral-600" />
                    </button>
                </div>
            </div>

            {/* Status Legend */}
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex flex-wrap gap-4">
                {Object.entries(statusConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                        />
                        <span className="text-neutral-600">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
                </div>
            )}

            {/* Calendar Grid */}
            <div className="relative">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-neutral-200">
                    {dayNames.map((day) => (
                        <div
                            key={day}
                            className="py-3 text-center text-sm font-semibold text-neutral-500 bg-neutral-50"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className={`grid grid-cols-7 ${viewMode === 'week' ? 'min-h-[400px]' : ''}`}>
                    {displayDays.map((date, index) => {
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(date, today);
                        const dayEvents = getEventsForDay(date);

                        return (
                            <div
                                key={index}
                                onClick={() => onDateSelect?.(date)}
                                className={`
                                    min-h-[100px] p-2 border-b border-r border-neutral-100
                                    cursor-pointer hover:bg-neutral-50 transition
                                    ${!isCurrentMonth ? 'bg-neutral-50/50' : ''}
                                    ${viewMode === 'week' ? 'min-h-[400px]' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`
                                            w-7 h-7 flex items-center justify-center rounded-full
                                            text-sm font-medium
                                            ${isToday
                                                ? 'bg-emerald-600 text-white'
                                                : isCurrentMonth
                                                    ? 'text-neutral-900'
                                                    : 'text-neutral-400'
                                            }
                                        `}
                                    >
                                        {date.getDate()}
                                    </span>
                                    {dayEvents.length > 0 && viewMode === 'month' && (
                                        <span className="text-xs text-neutral-400">
                                            {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Events */}
                                <div className="space-y-1">
                                    {dayEvents.slice(0, viewMode === 'week' ? 10 : 3).map((event) => (
                                        <motion.button
                                            key={event.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(event);
                                            }}
                                            className="w-full text-left px-2 py-1 rounded text-xs font-medium
                                                truncate text-white shadow-sm"
                                            style={{ backgroundColor: event.backgroundColor }}
                                        >
                                            {viewMode === 'week' && (
                                                <span className="block text-white/80 text-[10px]">
                                                    {new Date(event.start).toLocaleTimeString('es-MX', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            )}
                                            {event.title}
                                        </motion.button>
                                    ))}
                                    {dayEvents.length > (viewMode === 'week' ? 10 : 3) && (
                                        <p className="text-xs text-neutral-500 pl-2">
                                            +{dayEvents.length - (viewMode === 'week' ? 10 : 3)} más
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event Details Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailsModal
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onAction={onEventAction}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default EventCalendar;
