"use client"

import { useState, useMemo } from 'react';
import { Reservation } from '../../lib/api';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationCalendarProps {
    reservations: Reservation[];
    onSelectDate: (date: Date) => void;
    onSelectReservation: (reservation: Reservation) => void;
}

export function ReservationCalendar({ reservations, onSelectDate, onSelectReservation }: ReservationCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const reservationsByDate = useMemo(() => {
        const map = new Map<string, Reservation[]>();
        reservations.forEach(res => {
            const dateKey = format(new Date(res.reservation_time), 'yyyy-MM-dd');
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(res);
        });
        return map;
    }, [reservations]);

    const selectedDateReservations = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return reservationsByDate.get(dateKey) || [];
    }, [selectedDate, reservationsByDate]);

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        onSelectDate(day);
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500';
            case 'seated': return 'bg-blue-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <h3 className="text-xl font-bold text-white capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h3>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayReservations = reservationsByDate.get(dateKey) || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <button
                                key={i}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    aspect-square p-2 rounded-xl transition-all relative
                                    ${isCurrentMonth ? 'text-white hover:bg-slate-800' : 'text-slate-600'}
                                    ${isSelected ? 'bg-emerald-600/30 ring-2 ring-emerald-500' : ''}
                                    ${isToday && !isSelected ? 'ring-1 ring-slate-500' : ''}
                                `}
                            >
                                <span className={`text-sm font-medium ${isToday ? 'text-emerald-400' : ''}`}>
                                    {format(day, 'd')}
                                </span>

                                {dayReservations.length > 0 && isCurrentMonth && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                        {dayReservations.slice(0, 3).map((res, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-1.5 h-1.5 rounded-full ${statusColor(res.status)}`}
                                            />
                                        ))}
                                        {dayReservations.length > 3 && (
                                            <span className="text-[10px] text-slate-400 ml-0.5">+{dayReservations.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 justify-center text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmada
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Sentada
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-500" /> Pendiente
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Cancelada
                    </div>
                </div>
            </div>

            {/* Selected Day Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h4 className="font-bold text-white mb-4">
                    {selectedDate
                        ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                        : 'Selecciona un día'
                    }
                </h4>

                {selectedDate ? (
                    selectedDateReservations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>Sin reservaciones</p>
                            <p className="text-sm mt-1">para este día</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {selectedDateReservations
                                .sort((a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime())
                                .map(res => (
                                    <button
                                        key={res.id}
                                        onClick={() => onSelectReservation(res)}
                                        className="w-full p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-left"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-lg font-bold text-white">
                                                {format(new Date(res.reservation_time), 'HH:mm')}
                                            </span>
                                            <span className={`
                                                px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${res.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                                                ${res.status === 'seated' ? 'bg-blue-500/20 text-blue-400' : ''}
                                                ${res.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : ''}
                                                ${res.status === 'pending' ? 'bg-slate-500/20 text-slate-400' : ''}
                                            `}>
                                                {res.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Users className="w-3 h-3" />
                                            <span>{res.party_size} personas</span>
                                        </div>
                                        {res.notes && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">{res.notes}</p>
                                        )}
                                    </button>
                                ))
                            }
                        </div>
                    )
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <p>Haz clic en un día</p>
                        <p className="text-sm mt-1">para ver las reservaciones</p>
                    </div>
                )}
            </div>
        </div>
    );
}
