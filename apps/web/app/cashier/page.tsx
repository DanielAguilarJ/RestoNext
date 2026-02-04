"use client";

import { useState, useEffect } from "react";
import {
    Receipt, Sparkles, Banknote, CreditCard, ArrowUpRight,
    ArrowDownRight, History, Power, Wallet, Plus,
    ArrowLeft, ClipboardList, Info
} from "lucide-react";
import Link from "next/link";
import { cashierApi, ordersApi, CashShift, CashTransaction } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { CashClosureModal } from "@/components/cashier/CashClosureModal";
import { XReportModal } from "@/components/cashier/XReportModal";

export default function CashierPage() {
    const toast = (msg: { title: string, description: string, variant?: string }) => {
        alert(`${msg.title}: ${msg.description}`);
    };

    const [shift, setShift] = useState<CashShift | null>(null);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showXReportModal, setShowXReportModal] = useState(false);
    const [openingAmount, setOpeningAmount] = useState<string>("500");
    const [isProcessing, setIsProcessing] = useState(false);

    // Load data
    const loadData = async () => {
        try {
            const currentShift = await cashierApi.getCurrentShift();
            setShift(currentShift);

            // Parallel load
            const [txData, ordersData] = await Promise.all([
                cashierApi.getTransactions(),
                ordersApi.list({ status: "delivered,ready,in_progress,open,pending_payment" }) // Show all active orders
            ]);

            setTransactions(txData.transactions);
            setPendingOrders(ordersData);
        } catch (error: any) {
            if (error.message?.includes("404")) {
                setShift(null);
            } else {
                console.error("Error loading data:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // WebSocket Integration for Real-time Updates
        let unsubscribeNew: () => void;
        let unsubscribeUpdate: () => void;

        const handleRefresh = () => {
            console.log('[Cashier] Refreshing data due to WebSocket event');
            loadData();
        };

        // Dynamic import to avoid SSR issues
        import('@/lib/api').then(({ wsClient }) => {
            wsClient.connect(); // Ensure connected
            unsubscribeNew = wsClient.subscribe('new_order', handleRefresh);
            unsubscribeUpdate = wsClient.subscribe('order_update', handleRefresh);
        });

        return () => {
            if (unsubscribeNew) unsubscribeNew();
            if (unsubscribeUpdate) unsubscribeUpdate();
        };
    }, []);

    const handleOpenShift = async () => {
        setIsProcessing(true);
        try {
            await cashierApi.openShift(parseFloat(openingAmount));
            toast({ title: "Caja Abierta", description: "Turno iniciado correctamente" });
            loadData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseShift = async (data: any) => {
        return await cashierApi.closeShift(data);
    };

    const handleDrop = async () => {
        const amount = prompt("Monto a retirar:");
        if (!amount) return;
        const notes = prompt("Concepto del retiro:");

        try {
            await cashierApi.recordDrop(parseFloat(amount), notes || "");
            toast({ title: "Retiro Exitoso", description: "Sangría registrada correctamente" });
            loadData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Receipt className="w-12 h-12 text-emerald-500 animate-bounce" />
                    <p className="text-gray-500 font-medium">Cargando estado de caja...</p>
                </div>
            </div>
        );
    }

    // STATE: No shift open
    if (!shift) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
                <div className="glass max-w-md w-full p-8 rounded-3xl shadow-2xl border-2 border-white/50 animate-scale-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/30 mx-auto mb-6">
                        <Wallet className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Caja Cerrada</h1>
                        <p className="text-gray-500">Debes abrir un turno para comenzar a operar.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fondo Fijo Inicial (MXN)
                            </label>
                            <div className="relative">
                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl py-4 pl-12 pr-4 text-xl font-bold focus:border-emerald-500 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleOpenShift}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
                        >
                            {isProcessing ? "Abriendo..." : "Abrir Turno de Caja"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // STATE: Dashboard (Shift Open)
    return (
        <div className="min-h-screen bg-mesh pb-12">
            {/* Header */}
            <header className="glass shadow-lg p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-3 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <Receipt className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                Caja Principal
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            </h1>
                            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Turno Activo</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCloseModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold transition-all"
                    >
                        <Power className="w-4 h-4" />
                        Cerrar Caja
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Orders & Transactions */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Active Orders Ready to Close */}
                    <div className="glass rounded-3xl p-6 border-l-4 border-amber-500">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-amber-500" />
                                Cuentas Pendientes
                            </h3>
                            <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">
                                {pendingOrders.length} por cobrar
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingOrders.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-gray-400 italic">
                                    No hay mesas con cuentas pendientes.
                                </div>
                            ) : (
                                pendingOrders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/cashier/split/${order.id}`}
                                        className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-amber-500 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                                                {order.table_id || "S/N"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Mesa {order.table_id || "S/N"}</p>
                                                <p className="text-xs text-gray-500">{order.items?.length || 0} productos</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-amber-600">{formatPrice(order.total_amount)}</p>
                                            <p className="text-[10px] text-gray-400 group-hover:text-amber-500 flex items-center gap-1">
                                                Cobrar <ArrowUpRight className="w-3 h-3" />
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass p-6 rounded-2xl border-l-4 border-emerald-500">
                            <p className="text-sm text-gray-500 mb-1">Ventas Efectivo</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatPrice(shift.cash_sales)}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2 font-medium">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Incremento en turno</span>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-2xl border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500 mb-1">Ventas Tarjeta</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatPrice(shift.card_sales)}
                            </h3>
                        </div>
                        <div className="glass p-6 rounded-2xl border-l-4 border-red-500">
                            <p className="text-sm text-gray-500 mb-1">Retiros (Sangrías)</p>
                            <h3 className="text-2xl font-bold text-red-600">
                                -{formatPrice(shift.total_drops)}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-red-500 mt-2 font-medium">
                                <ArrowDownRight className="w-3 h-3" />
                                <span>Salidas de efectivo</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Cash Display */}
                    <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <p className="text-blue-200 text-sm uppercase tracking-widest font-semibold mb-1">Efectivo Esperado en Caja</p>
                                    <h2 className="text-5xl font-black">{formatPrice(shift.expected_cash)}</h2>
                                </div>
                                <Sparkles className="w-10 h-10 text-yellow-400 opacity-50" />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={handleDrop}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-bold transition-all border border-white/10"
                                >
                                    <Plus className="w-5 h-5" />
                                    Registrar Retiro
                                </button>
                                <button
                                    onClick={() => setShowXReportModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
                                >
                                    <ClipboardList className="w-5 h-5" />
                                    Ver Resumen X
                                </button>
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20" />
                    </div>

                    {/* Transaction History */}
                    <div className="glass rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-400" />
                                Movimientos del Turno
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {transactions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Info className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p>No hay movimientos registrados en este turno.</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={tx.type === "sale" ? "text-emerald-500" : "text-red-500"}>
                                                {tx.type === "sale" ? (
                                                    tx.payment_method === "card" ? <CreditCard className="w-6 h-6" /> :
                                                        tx.payment_method === "transfer" ? <Wallet className="w-6 h-6" /> :
                                                            <Banknote className="w-6 h-6" />
                                                ) : <ArrowDownRight className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white capitalize">
                                                    {tx.type === "sale" ? (
                                                        tx.payment_method === "card" ? "Venta con Tarjeta" :
                                                            tx.payment_method === "transfer" ? "Venta con Transferencia" :
                                                                "Venta en Efectivo"
                                                    ) : "Retiro (Sangría)"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(tx.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                    {tx.notes ? ` • ${tx.notes}` : ""}
                                                </p>
                                                {tx.tip_amount > 0 && (
                                                    <p className="text-xs text-amber-500 font-medium">
                                                        + {formatPrice(tx.tip_amount)} propina
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={tx.type === "sale" ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                                                {tx.type === "sale" ? "+" : "-"}{formatPrice(tx.amount)}
                                            </div>
                                            {tx.tip_amount > 0 && (
                                                <div className="text-xs text-amber-500 font-medium">
                                                    (Total: {formatPrice(tx.amount + tx.tip_amount)})
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-brand-500" />
                            Detalles del Turno
                        </h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Fondo Inicial:</span>
                                <span className="font-semibold">{formatPrice(shift.opening_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Apertura:</span>
                                <span className="font-semibold">{new Date(shift.opened_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {shift && (
                <CashClosureModal
                    isOpen={showCloseModal}
                    onClose={() => setShowCloseModal(false)}
                    shiftSummary={{
                        opening_amount: shift.opening_amount,
                        cash_sales: shift.cash_sales,
                        total_drops: shift.total_drops,
                        total_tips: shift.total_tips || 0,
                        expected_cash: shift.expected_cash
                    }}
                    onCloseShift={async (data) => {
                        const res = await handleCloseShift(data);
                        window.location.reload();
                        return res;
                    }}
                />
            )}

            {/* X Report Modal */}
            <XReportModal
                isOpen={showXReportModal}
                onClose={() => setShowXReportModal(false)}
            />
        </div>
    );
}
