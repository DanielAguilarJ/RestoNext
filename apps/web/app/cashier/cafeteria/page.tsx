"use client";

/**
 * RestoNext MX - Cafeteria Cashier Page
 * =====================================
 * Specialized view for cafeteria flow:
 * 1. Shows incoming orders awaiting payment
 * 2. Mark orders as paid -> sends to kitchen
 * 3. Real-time updates via WebSocket
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Receipt, Banknote, CreditCard, ArrowLeft, Clock,
    Check, AlertCircle, RefreshCw, Wallet, ChefHat,
    Sparkles, ArrowUpRight, Phone
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    modifiers: string[];
}

interface Order {
    id: string;
    table_number: number;
    status: string;
    created_at: string;
    items: OrderItem[];
    total: number;
    notes?: string;
}

export default function CafeteriaCashierPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");

    // Toast notification (simple)
    const toast = (msg: { title: string; description: string; variant?: string }) => {
        alert(`${msg.title}: ${msg.description}`);
    };

    // Load pending orders
    const loadOrders = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/kds/orders?include_statuses=open,pending_payment`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load orders');
            }

            const data = await response.json();
            setOrders(data.orders || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error loading orders');
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();

        // Poll for new orders every 5 seconds
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, [loadOrders]);

    // Mark order as paid
    const handleMarkPaid = async (orderId: string) => {
        setProcessingOrder(orderId);
        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/kds/orders/${orderId}/paid`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_method: selectedPaymentMethod,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to mark order as paid');
            }

            toast({
                title: "¡Pedido Pagado!",
                description: "Enviado a cocina para preparación"
            });

            // Remove from local list
            setOrders(prev => prev.filter(o => o.id !== orderId));

        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setProcessingOrder(null);
        }
    };

    // Format time since order
    const formatTimeSince = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Ahora";
        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        return `${hours}h ${diffMins % 60}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Receipt className="w-12 h-12 text-emerald-500 animate-bounce" />
                    <p className="text-slate-400 font-medium">Cargando pedidos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                        Caja Cafetería
                                        <Sparkles className="w-5 h-5 text-yellow-400" />
                                    </h1>
                                    <p className="text-sm text-slate-400">Cobra y envía a cocina</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-800/50 rounded-xl px-4 py-2 flex items-center gap-2 border border-slate-700">
                                <Receipt className="w-5 h-5 text-yellow-500" />
                                <span className="text-white font-bold">{orders.length}</span>
                                <span className="text-slate-400 text-sm">pendientes</span>
                            </div>
                            <button
                                onClick={loadOrders}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                                title="Actualizar"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="max-w-7xl mx-auto px-6 pt-4">
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300">{error}</span>
                        </div>
                        <button
                            onClick={loadOrders}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Method Selector */}
            <div className="max-w-7xl mx-auto px-6 pt-6">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6">
                    <p className="text-sm text-slate-400 mb-3">Método de Pago Predeterminado</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedPaymentMethod("cash")}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                selectedPaymentMethod === "cash"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                        >
                            <Banknote className="w-5 h-5" />
                            Efectivo
                        </button>
                        <button
                            onClick={() => setSelectedPaymentMethod("card")}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                selectedPaymentMethod === "card"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                        >
                            <CreditCard className="w-5 h-5" />
                            Tarjeta
                        </button>
                        <button
                            onClick={() => setSelectedPaymentMethod("transfer")}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                selectedPaymentMethod === "transfer"
                                    ? "bg-violet-600 text-white"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                        >
                            <Phone className="w-5 h-5" />
                            Transferencia
                        </button>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            <main className="max-w-7xl mx-auto px-6 pb-12">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                            <Receipt className="w-12 h-12 text-slate-600" />
                        </div>
                        <p className="text-xl font-medium text-slate-400 mb-2">Sin pedidos pendientes</p>
                        <p className="text-slate-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map((order, index) => (
                            <div
                                key={order.id}
                                className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-all animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Order Header */}
                                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-bold text-lg">
                                            Mesa {order.table_number}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            order.status === "pending_payment"
                                                ? "bg-yellow-500/20 text-yellow-400"
                                                : "bg-slate-600 text-slate-300"
                                        )}>
                                            {order.status === "pending_payment" ? "Por Cobrar" : order.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-sm font-mono">
                                            {formatTimeSince(order.created_at)}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="p-4 space-y-2">
                                    {order.items.map((item) => (
                                        <div key={item.id} className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                                <span className="bg-slate-700 text-white font-bold px-2 py-0.5 rounded text-sm">
                                                    {item.quantity}x
                                                </span>
                                                <div>
                                                    <span className="text-white font-medium">{item.name}</span>
                                                    {item.modifiers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {item.modifiers.map((mod, i) => (
                                                                <span key={i} className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                                                                    {mod}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-xs text-yellow-400 mt-1">📝 {item.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {order.notes && (
                                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                            <p className="text-sm text-yellow-400">📝 {order.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Footer */}
                                <div className="border-t border-slate-700 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400">Total</span>
                                        <span className="text-2xl font-bold text-white">
                                            {formatPrice(order.total)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleMarkPaid(order.id)}
                                        disabled={processingOrder === order.id}
                                        className={cn(
                                            "w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                                            "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
                                            "shadow-lg shadow-emerald-500/30 active:scale-[0.98]",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {processingOrder === order.id ? (
                                            <>
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                Pagado • Enviar a Cocina
                                                <ChefHat className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
