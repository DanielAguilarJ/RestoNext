"use client"

import { useState } from 'react';
import { X, User, Users, Clock, Calendar, MessageSquare, Check, XCircle, Armchair, Loader2 } from 'lucide-react';
import { Reservation, reservationsApi } from '../../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
    onUpdate: () => void;
}

export function ReservationDetailsModal({ isOpen, onClose, reservation, onUpdate }: ReservationDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !reservation) return null;

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        setError(null);
        try {
            await reservationsApi.updateStatus(reservation.id, newStatus);
            onUpdate();
            if (newStatus === 'cancelled') {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Error al actualizar estado');
        } finally {
            setLoading(false);
        }
    };

    const statusConfig: Record<string, { color: string; label: string }> = {
        pending: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', label: 'Pendiente' },
        confirmed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', label: 'Confirmada' },
        seated: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Sentada' },
        completed: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Completada' },
        cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/50', label: 'Cancelada' },
        no_show: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', label: 'No Show' }
    };

    const currentStatus = statusConfig[reservation.status] || statusConfig.pending;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white">Detalles de Reservación</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${currentStatus.color}`}>
                            {currentStatus.label}
                        </span>
                        {reservation.table_id && (
                            <span className="text-sm text-slate-400 flex items-center gap-1">
                                <Armchair className="w-4 h-4" />
                                Mesa asignada
                            </span>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-xs text-slate-500">Fecha</p>
                                <p className="text-white font-medium">
                                    {format(new Date(reservation.reservation_time), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-xs text-slate-500">Hora</p>
                                <p className="text-white font-medium text-xl">
                                    {format(new Date(reservation.reservation_time), 'HH:mm')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <Users className="w-5 h-5 text-purple-500" />
                            <div>
                                <p className="text-xs text-slate-500">Personas</p>
                                <p className="text-white font-medium">{reservation.party_size} personas</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                            <User className="w-5 h-5 text-amber-500" />
                            <div>
                                <p className="text-xs text-slate-500">Cliente</p>
                                <p className="text-white font-medium">
                                    {reservation.customer_id ? `ID: ${reservation.customer_id.slice(0, 8)}...` : 'Invitado'}
                                </p>
                            </div>
                        </div>

                        {reservation.notes && (
                            <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                                <MessageSquare className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Notas</p>
                                    <p className="text-white text-sm">{reservation.notes}</p>
                                </div>
                            </div>
                        )}

                        {reservation.tags && reservation.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {reservation.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                        <div className="pt-4 border-t border-slate-700 space-y-3">
                            <p className="text-sm text-slate-400 font-medium">Acciones Rápidas</p>
                            <div className="grid grid-cols-2 gap-3">
                                {reservation.status === 'pending' && (
                                    <button
                                        onClick={() => handleStatusChange('confirmed')}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Confirmar
                                    </button>
                                )}

                                {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                                    <button
                                        onClick={() => handleStatusChange('seated')}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Armchair className="w-4 h-4" />}
                                        Sentar
                                    </button>
                                )}

                                {reservation.status === 'seated' && (
                                    <button
                                        onClick={() => handleStatusChange('completed')}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Completar
                                    </button>
                                )}

                                <button
                                    onClick={() => handleStatusChange('cancelled')}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
