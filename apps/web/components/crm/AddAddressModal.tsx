"use client"

import { useState } from 'react';
import { X, MapPin, Tag, FileText, Loader2 } from 'lucide-react';
import { customersApi } from '../../lib/api';

interface AddAddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    onSuccess: () => void;
}

export function AddAddressModal({ isOpen, onClose, customerId, onSuccess }: AddAddressModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        label: '',
        address: '',
        instructions: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.label.trim() || !form.address.trim()) {
            setError('Etiqueta y dirección son requeridos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await customersApi.addAddress(customerId, {
                label: form.label.trim(),
                address: form.address.trim(),
                instructions: form.instructions.trim() || undefined
            });
            setForm({ label: '', address: '', instructions: '' });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al agregar dirección');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white">Nueva Dirección</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Etiqueta *
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={form.label}
                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                                placeholder="Casa, Oficina, etc."
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Dirección *
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="Calle, número, colonia, ciudad..."
                                rows={2}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Instrucciones de entrega
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                value={form.instructions}
                                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                                placeholder="Tocar timbre, dejar con portero, etc."
                                rows={2}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
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
                                'Agregar Dirección'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
