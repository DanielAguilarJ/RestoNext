"use client"

import { useState, useEffect } from 'react';
import { X, User, Users, Calendar, Clock, MessageSquare, Loader2, Search } from 'lucide-react';
import { reservationsApi, customersApi, Customer } from '../../lib/api';

interface CreateReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date;
}

export function CreateReservationModal({ isOpen, onClose, onSuccess, initialDate }: CreateReservationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchCustomer, setSearchCustomer] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    const [form, setForm] = useState({
        customer_id: '',
        customer_name: '',
        party_size: 2,
        date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: '19:00',
        notes: ''
    });

    useEffect(() => {
        if (initialDate) {
            setForm(prev => ({
                ...prev,
                date: initialDate.toISOString().split('T')[0]
            }));
        }
    }, [initialDate]);

    useEffect(() => {
        if (searchCustomer.length >= 2) {
            customersApi.list(searchCustomer).then(setCustomers).catch(() => setCustomers([]));
        } else {
            setCustomers([]);
        }
    }, [searchCustomer]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customer_id && !form.customer_name.trim()) {
            setError('Selecciona un cliente o ingresa un nombre');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const reservationTime = new Date(`${form.date}T${form.time}:00`);

            await reservationsApi.create({
                customer_id: form.customer_id || undefined,
                customer_name: !form.customer_id ? form.customer_name.trim() : undefined,
                party_size: form.party_size,
                reservation_time: reservationTime.toISOString(),
                notes: form.notes.trim() || undefined,
                tags: []
            });

            setForm({
                customer_id: '',
                customer_name: '',
                party_size: 2,
                date: new Date().toISOString().split('T')[0],
                time: '19:00',
                notes: ''
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al crear reservación');
        } finally {
            setLoading(false);
        }
    };

    const selectCustomer = (customer: Customer) => {
        setForm(prev => ({ ...prev, customer_id: customer.id, customer_name: customer.name }));
        setShowCustomerSearch(false);
        setSearchCustomer('');
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white">Nueva Reservación</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Customer Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Cliente *</label>
                        {form.customer_id ? (
                            <div className="flex items-center gap-2 p-3 bg-slate-800 border border-slate-700 rounded-xl">
                                <User className="w-4 h-4 text-emerald-500" />
                                <span className="text-white flex-1">{form.customer_name}</span>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, customer_id: '', customer_name: '' }))}
                                    className="text-slate-400 hover:text-white text-sm"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={searchCustomer}
                                        onChange={(e) => {
                                            setSearchCustomer(e.target.value);
                                            setShowCustomerSearch(true);
                                        }}
                                        onFocus={() => setShowCustomerSearch(true)}
                                        placeholder="Buscar cliente existente..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                                    />
                                </div>

                                {showCustomerSearch && customers.length > 0 && (
                                    <div className="bg-slate-800 border border-slate-700 rounded-xl max-h-40 overflow-y-auto">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => selectCustomer(c)}
                                                className="w-full p-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2"
                                            >
                                                <User className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <div className="text-white text-sm">{c.name}</div>
                                                    <div className="text-xs text-slate-500">{c.phone || c.email}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={form.customer_name}
                                        onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                        placeholder="O ingresa nombre de nuevo cliente"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Party Size */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Personas *</label>
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-slate-500" />
                            <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1 flex-1">
                                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, party_size: n }))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.party_size === n
                                                ? 'bg-emerald-600 text-white'
                                                : 'text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Fecha *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Hora *</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={form.time}
                                    onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-emerald-500 outline-none appearance-none"
                                >
                                    {['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
                                        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Notas</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Ocasión especial, alergias, preferencias..."
                                rows={2}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Crear Reservación'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
