'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, DollarSign, CreditCard, Banknote, ArrowDownCircle, Clock, Users, Receipt, TrendingUp } from 'lucide-react';
import { cashierApi, XReportResponse } from '@/lib/api';

interface XReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function XReportModal({ isOpen, onClose }: XReportModalProps) {
    const [report, setReport] = useState<XReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadReport();
        }
    }, [isOpen]);

    const loadReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await cashierApi.getXReport();
            setReport(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el reporte');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    const formatDuration = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Reporte X</h2>
                                <p className="text-blue-100 text-sm">Resumen de turno actual</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={loadReport}
                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : report && (
                        <div className="space-y-6">
                            {/* Shift Info */}
                            <div className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-white font-medium">{report.cashier}</p>
                                        <p className="text-gray-400 text-sm">
                                            {report.register_id ? `Caja ${report.register_id}` : 'Caja Principal'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatDuration(report.duration_hours)}</span>
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        Abierto: {new Date(report.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Sales Summary */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Ventas
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                        <p className="text-emerald-400 text-sm">Total Ventas</p>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(report.total_sales)}</p>
                                        <p className="text-gray-500 text-xs mt-1">{report.sales_count} ventas</p>
                                    </div>
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                            <Banknote className="w-4 h-4" />
                                            Efectivo
                                        </div>
                                        <p className="text-xl font-bold text-white mt-1">{formatCurrency(report.cash_sales)}</p>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                                            <CreditCard className="w-4 h-4" />
                                            Tarjeta
                                        </div>
                                        <p className="text-xl font-bold text-white mt-1">{formatCurrency(report.card_sales)}</p>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-purple-400 text-sm">
                                            <DollarSign className="w-4 h-4" />
                                            Transferencia
                                        </div>
                                        <p className="text-xl font-bold text-white mt-1">{formatCurrency(report.transfer_sales)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            {report.total_tips > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-amber-400" />
                                            <span className="text-amber-400 font-medium">Propinas</span>
                                        </div>
                                        <span className="text-xl font-bold text-white">{formatCurrency(report.total_tips)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Cash Movement */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <ArrowDownCircle className="w-4 h-4" />
                                    Movimientos de Efectivo
                                </h3>
                                <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Fondo Inicial</span>
                                        <span className="text-white font-medium">{formatCurrency(report.opening_amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Ventas en Efectivo</span>
                                        <span className="text-green-400 font-medium">+{formatCurrency(report.cash_sales)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">
                                            Sangrías ({report.drops_count})
                                        </span>
                                        <span className="text-red-400 font-medium">-{formatCurrency(report.total_drops)}</span>
                                    </div>
                                    <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                                        <span className="text-white font-bold">Efectivo Esperado</span>
                                        <span className="text-2xl font-bold text-emerald-400">{formatCurrency(report.expected_cash)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Count */}
                            <div className="text-center text-gray-500 text-sm">
                                Total de movimientos: {report.transactions_count}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default XReportModal;
