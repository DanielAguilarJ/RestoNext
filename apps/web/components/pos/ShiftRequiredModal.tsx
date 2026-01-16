'use client';

import React, { useState } from 'react';
import { AlertTriangle, DollarSign, Clock, LogIn } from 'lucide-react';

// ============================================
// Types
// ============================================

interface ShiftRequiredModalProps {
    isOpen: boolean;
    onOpenShift: (openingAmount: number) => Promise<void>;
    onGoToCashier: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Modal that blocks POS access when no active shift is open.
 * Forces the user to either:
 * 1. Open a quick shift with $0 (for waiters)
 * 2. Navigate to full cashier module (for managers)
 */
export function ShiftRequiredModal({
    isOpen,
    onOpenShift,
    onGoToCashier
}: ShiftRequiredModalProps) {
    const [openingAmount, setOpeningAmount] = useState<string>('0');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleQuickOpen = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const amount = parseFloat(openingAmount) || 0;
            await onOpenShift(amount);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo abrir el turno';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-700 m-4">
                {/* Header with Warning */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Turno Requerido</h2>
                            <p className="text-amber-100 text-sm mt-0.5">
                                Debes abrir turno para operar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Explanation */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                        <p className="text-amber-300 text-sm">
                            Para registrar pedidos y cobros, primero debes tener un turno de caja activo.
                            Esto garantiza el control correcto del efectivo.
                        </p>
                    </div>

                    {/* Quick Open Option */}
                    <div className="space-y-4">
                        <h3 className="text-white font-medium flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-400" />
                            Apertura Rápida
                        </h3>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">
                                Fondo Inicial (opcional)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <DollarSign className="w-5 h-5" />
                                </span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleQuickOpen}
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-3
                                     shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Abriendo...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Abrir Turno
                                </>
                            )}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-700" />
                        <span className="text-gray-500 text-sm">o</span>
                        <div className="flex-1 h-px bg-gray-700" />
                    </div>

                    {/* Go to Cashier Module */}
                    <button
                        onClick={onGoToCashier}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 font-medium transition-colors"
                    >
                        Ir al Módulo de Caja Completo
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ShiftRequiredModal;
