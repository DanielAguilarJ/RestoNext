'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Banknote, Coins, ClipboardCheck, Printer } from 'lucide-react';

// ============================================
// Types
// ============================================

interface CashBreakdown {
    bills_1000: number;
    bills_500: number;
    bills_200: number;
    bills_100: number;
    bills_50: number;
    bills_20: number;
    coins_20: number;
    coins_10: number;
    coins_5: number;
    coins_2: number;
    coins_1: number;
    coins_050: number;
}

interface ShiftSummary {
    opening_amount: number;
    cash_sales: number;
    total_drops: number;
    total_tips: number;  // Total tips collected during shift
    expected_cash: number;
}

interface CloseShiftResponse {
    shift_id: string;
    opened_at: string;
    closed_at: string;
    cashier: string;
    opening_amount: number;
    total_sales: number;
    cash_sales: number;
    card_sales: number;
    total_tips: number;  // Total tips collected during shift
    expected_cash: number;
    real_cash: number;
    difference: number;
    status: 'exact' | 'over' | 'short';
}

interface CashClosureModalProps {
    isOpen: boolean;
    onClose: () => void;
    shiftSummary: ShiftSummary;
    onCloseShift: (data: { real_cash: number; cash_breakdown: CashBreakdown; notes?: string }) => Promise<CloseShiftResponse>;
}

// ============================================
// Denomination Data
// ============================================

const BILLS = [
    { key: 'bills_1000', value: 1000, label: '$1,000' },
    { key: 'bills_500', value: 500, label: '$500' },
    { key: 'bills_200', value: 200, label: '$200' },
    { key: 'bills_100', value: 100, label: '$100' },
    { key: 'bills_50', value: 50, label: '$50' },
    { key: 'bills_20', value: 20, label: '$20' },
] as const;

const COINS = [
    { key: 'coins_20', value: 20, label: '$20' },
    { key: 'coins_10', value: 10, label: '$10' },
    { key: 'coins_5', value: 5, label: '$5' },
    { key: 'coins_2', value: 2, label: '$2' },
    { key: 'coins_1', value: 1, label: '$1' },
    { key: 'coins_050', value: 0.5, label: '$0.50' },
] as const;

const initialBreakdown: CashBreakdown = {
    bills_1000: 0, bills_500: 0, bills_200: 0, bills_100: 0, bills_50: 0, bills_20: 0,
    coins_20: 0, coins_10: 0, coins_5: 0, coins_2: 0, coins_1: 0, coins_050: 0,
};

// ============================================
// Component
// ============================================

export function CashClosureModal({ isOpen, onClose, shiftSummary, onCloseShift }: CashClosureModalProps) {
    const [step, setStep] = useState(1);
    const [breakdown, setBreakdown] = useState<CashBreakdown>(initialBreakdown);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<CloseShiftResponse | null>(null);

    // Calculate totals
    const billsTotal = useMemo(() => {
        return BILLS.reduce((sum, bill) => sum + breakdown[bill.key] * bill.value, 0);
    }, [breakdown]);

    const coinsTotal = useMemo(() => {
        return COINS.reduce((sum, coin) => sum + breakdown[coin.key] * coin.value, 0);
    }, [breakdown]);

    const realCash = billsTotal + coinsTotal;
    const difference = realCash - shiftSummary.expected_cash;

    const updateCount = useCallback((key: keyof CashBreakdown, delta: number) => {
        setBreakdown(prev => ({
            ...prev,
            [key]: Math.max(0, prev[key] + delta),
        }));
    }, []);

    const handleClose = () => {
        setStep(1);
        setBreakdown(initialBreakdown);
        setNotes('');
        setResult(null);
        onClose();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await onCloseShift({
                real_cash: realCash,
                cash_breakdown: breakdown,
                notes: notes || undefined,
            });
            setResult(response);
            setStep(4);
        } catch (error) {
            console.error('Failed to close shift:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Corte de Caja</h2>
                            <p className="text-emerald-100 text-sm mt-1">
                                {step < 4 ? `Paso ${step} de 3` : 'Completado'}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex gap-2 mt-4">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-white' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Step 1: Bills */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-emerald-400 mb-4">
                                <Banknote className="w-6 h-6" />
                                <h3 className="text-lg font-semibold">Contar Billetes</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {BILLS.map((bill) => (
                                    <div
                                        key={bill.key}
                                        className="bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                                    >
                                        <span className="text-lg font-medium text-white">{bill.label}</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateCount(bill.key, -1)}
                                                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl font-bold text-white transition-colors"
                                            >
                                                −
                                            </button>
                                            <span className="w-12 text-center text-xl font-semibold text-white">
                                                {breakdown[bill.key]}
                                            </span>
                                            <button
                                                onClick={() => updateCount(bill.key, 1)}
                                                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-xl font-bold text-white transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-800/50 rounded-xl p-4 mt-4">
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-400">Subtotal Billetes:</span>
                                    <span className="font-bold text-white">
                                        ${billsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Coins */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-amber-400 mb-4">
                                <Coins className="w-6 h-6" />
                                <h3 className="text-lg font-semibold">Contar Monedas</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {COINS.map((coin) => (
                                    <div
                                        key={coin.key}
                                        className="bg-gray-800 rounded-xl p-4 flex items-center justify-between"
                                    >
                                        <span className="text-lg font-medium text-white">{coin.label}</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateCount(coin.key, -1)}
                                                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl font-bold text-white transition-colors"
                                            >
                                                −
                                            </button>
                                            <span className="w-12 text-center text-xl font-semibold text-white">
                                                {breakdown[coin.key]}
                                            </span>
                                            <button
                                                onClick={() => updateCount(coin.key, 1)}
                                                className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center text-xl font-bold text-white transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-800/50 rounded-xl p-4 mt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Billetes:</span>
                                    <span className="text-white">${billsTotal.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Monedas:</span>
                                    <span className="text-white">${coinsTotal.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="border-t border-gray-700 pt-2 flex justify-between text-lg">
                                    <span className="text-gray-400">Total Contado:</span>
                                    <span className="font-bold text-white">
                                        ${realCash.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-blue-400 mb-4">
                                <ClipboardCheck className="w-6 h-6" />
                                <h3 className="text-lg font-semibold">Revisar y Confirmar</h3>
                            </div>

                            <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                                <div className="flex justify-between py-2 border-b border-gray-700">
                                    <span className="text-gray-400">Fondo Inicial</span>
                                    <span className="text-white">${shiftSummary.opening_amount.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700">
                                    <span className="text-gray-400">Ventas en Efectivo</span>
                                    <span className="text-emerald-400">+${shiftSummary.cash_sales.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700">
                                    <span className="text-gray-400">Propinas</span>
                                    <span className="text-amber-400">+${(shiftSummary.total_tips || 0).toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700">
                                    <span className="text-gray-400">Retiros (Sangrías)</span>
                                    <span className="text-red-400">-${shiftSummary.total_drops.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700 text-lg">
                                    <span className="text-gray-300 font-medium">Efectivo Esperado</span>
                                    <span className="font-bold text-white">${shiftSummary.expected_cash.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700 text-lg">
                                    <span className="text-gray-300 font-medium">Efectivo Contado</span>
                                    <span className="font-bold text-white">${realCash.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between py-3 text-xl">
                                    <span className="font-bold text-white">Diferencia</span>
                                    <span className={`font-bold ${difference === 0 ? 'text-emerald-400' :
                                        difference > 0 ? 'text-blue-400' : 'text-red-400'
                                        }`}>
                                        {difference >= 0 ? '+' : ''}${difference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        <span className="text-sm ml-2">
                                            {difference === 0 ? '(Cuadra)' : difference > 0 ? '(Sobrante)' : '(Faltante)'}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2">Notas (opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    rows={3}
                                    placeholder="Agregar observaciones..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 4 && result && (
                        <div className="space-y-6 text-center">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${result.status === 'exact' ? 'bg-emerald-500/20' :
                                result.status === 'over' ? 'bg-blue-500/20' : 'bg-red-500/20'
                                }`}>
                                <ClipboardCheck className={`w-10 h-10 ${result.status === 'exact' ? 'text-emerald-400' :
                                    result.status === 'over' ? 'text-blue-400' : 'text-red-400'
                                    }`} />
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Turno Cerrado
                                </h3>
                                <p className="text-gray-400">
                                    {result.status === 'exact' && 'La caja cuadra perfectamente'}
                                    {result.status === 'over' && `Sobrante de $${result.difference.toFixed(2)}`}
                                    {result.status === 'short' && `Faltante de $${Math.abs(result.difference).toFixed(2)}`}
                                </p>
                            </div>

                            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Ventas:</span>
                                    <span className="text-white">${result.total_sales.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Efectivo:</span>
                                    <span className="text-white">${result.cash_sales.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Tarjeta:</span>
                                    <span className="text-white">${result.card_sales.toLocaleString('es-MX')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Propinas:</span>
                                    <span className="text-amber-400">${(result.total_tips || 0).toLocaleString('es-MX')}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white transition-colors"
                            >
                                <Printer className="w-5 h-5" />
                                Imprimir Resumen
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                {step < 4 && (
                    <div className="p-6 border-t border-gray-700 flex justify-between">
                        <button
                            onClick={() => setStep((s) => Math.max(1, s - 1))}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Atrás
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={() => setStep((s) => s + 1)}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
                            >
                                Siguiente
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
                            >
                                {isSubmitting ? 'Cerrando...' : 'Cerrar Turno'}
                            </button>
                        )}
                    </div>
                )}

                {step === 4 && (
                    <div className="p-6 border-t border-gray-700">
                        <button
                            onClick={handleClose}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
                        >
                            Finalizar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CashClosureModal;
