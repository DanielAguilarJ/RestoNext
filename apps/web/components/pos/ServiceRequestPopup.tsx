'use client';

/**
 * Service Request Popup Component
 * Premium floating notifications for real-time service requests
 * Shows bill requests, waiter calls, etc. from self-service tablets
 * 
 * Features:
 * - Animated slide-in notifications
 * - Sound & vibration alerts
 * - Click to navigate to table
 * - Auto-dismiss after action
 */

import React, { useState, useEffect } from 'react';
import {
    X, Bell, Receipt, Coffee, MessageSquare, Check, Clock,
    DollarSign, ChevronRight, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import {
    useServiceSocket,
    ServiceRequestNotification,
    BillRequestNotification,
    TableStatusNotification
} from '@/hooks/useServiceSocket';
import { usePOSStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

interface ServiceRequestPopupProps {
    onResolve?: (requestId: string) => void;
    onTableSelect?: (tableId: string) => void;
}

export function ServiceRequestPopup({ onResolve, onTableSelect }: ServiceRequestPopupProps) {
    const { tables, updateTableStatus, setSelectedTable } = usePOSStore();

    const {
        pendingRequests,
        pendingBillRequests,
        clearRequest,
        clearBillRequest,
        isConnected
    } = useServiceSocket({
        playSound: true,
        onTableStatusChange: React.useCallback((status: TableStatusNotification) => {
            // Auto-update table status in store
            updateTableStatus(status.table_id, status.status);
        }, [updateTableStatus])
    });

    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [dismissing, setDismissing] = useState<Set<string>>(new Set());

    // Handle resolving a service request
    const handleResolve = async (request: ServiceRequestNotification) => {
        setDismissing(prev => new Set(prev).add(request.id));

        setTimeout(() => {
            clearRequest(request.id);
            onResolve?.(request.id);
            setDismissing(prev => {
                const next = new Set(prev);
                next.delete(request.id);
                return next;
            });
        }, 300);
    };

    // Handle attending a bill request - navigate to the table
    const handleAttendBill = (request: BillRequestNotification) => {
        // Find the table in store
        const table = tables.find(t => t.id === request.table_id);
        if (table) {
            setSelectedTable(table);
            onTableSelect?.(request.table_id);
        }
        clearBillRequest(request.table_id);
    };

    // Dismiss bill request without navigation
    const handleDismissBill = (tableId: string) => {
        setDismissing(prev => new Set(prev).add(tableId));
        setTimeout(() => {
            clearBillRequest(tableId);
            setDismissing(prev => {
                const next = new Set(prev);
                next.delete(tableId);
                return next;
            });
        }, 300);
    };

    const getRequestIcon = (type: string) => {
        const icons: Record<string, React.ReactNode> = {
            'waiter': <Bell className="w-5 h-5" />,
            'bill': <Receipt className="w-5 h-5" />,
            'refill': <Coffee className="w-5 h-5" />,
            'custom': <MessageSquare className="w-5 h-5" />
        };
        return icons[type] || <Bell className="w-5 h-5" />;
    };

    const getRequestLabel = (type: string) => {
        const labels: Record<string, string> = {
            'waiter': 'Llamando mesero',
            'bill': 'Solicita cuenta',
            'refill': 'Recarga bebidas',
            'custom': 'Solicitud especial'
        };
        return labels[type] || 'Solicitud';
    };

    const getRequestColor = (type: string) => {
        const colors: Record<string, string> = {
            'waiter': 'from-orange-500 to-amber-500',
            'bill': 'from-green-500 to-emerald-500',
            'refill': 'from-blue-500 to-cyan-500',
            'custom': 'from-purple-500 to-fuchsia-500'
        };
        return colors[type] || 'from-gray-500 to-gray-600';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins}m`;
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    // Calculate time since request for urgency
    const getUrgencyLevel = (dateString: string): 'normal' | 'warning' | 'critical' => {
        const date = new Date(dateString);
        const diffMins = (Date.now() - date.getTime()) / 60000;
        if (diffMins > 5) return 'critical';
        if (diffMins > 2) return 'warning';
        return 'normal';
    };

    const totalPendingCount = pendingRequests.length + pendingBillRequests.length;

    if (totalPendingCount === 0 && isConnected) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full sm:w-auto">
            {/* Connection Status Indicator */}
            <div className={`
                self-end px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2
                transition-all duration-300 shadow-lg
                ${isConnected
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                }
            `}>
                {isConnected ? (
                    <>
                        <Wifi className="w-3 h-3" />
                        <span>Conectado</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-3 h-3" />
                        <span>Reconectando...</span>
                    </>
                )}
            </div>

            {/* Bill Request Cards (Priority - These are urgent) */}
            {pendingBillRequests.map(request => {
                const urgency = getUrgencyLevel(request.created_at);
                const isDismissing = dismissing.has(request.table_id);

                return (
                    <div
                        key={request.table_id}
                        className={`
                            bg-gradient-to-br from-gray-900 to-gray-800 
                            rounded-2xl shadow-2xl border overflow-hidden
                            transform transition-all duration-300
                            ${isDismissing ? 'scale-95 opacity-0 translate-x-full' : 'animate-slide-in-right'}
                            ${urgency === 'critical' ? 'border-red-500/50 shadow-red-500/20' :
                                urgency === 'warning' ? 'border-yellow-500/50 shadow-yellow-500/20' :
                                    'border-green-500/50 shadow-green-500/20'}
                        `}
                    >
                        {/* Urgency Indicator Bar */}
                        <div className={`h-1 w-full ${urgency === 'critical' ? 'bg-red-500 animate-pulse' :
                            urgency === 'warning' ? 'bg-yellow-500' :
                                'bg-green-500'
                            }`} />

                        {/* Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">Mesa {request.table_number}</div>
                                    <div className="text-xs text-green-100 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(request.created_at)}
                                    </div>
                                </div>
                            </div>
                            {urgency === 'critical' && (
                                <div className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="text-xs font-medium">Urgente</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Solicita la cuenta</p>
                                    <p className="text-3xl font-black text-white">
                                        {formatPrice(request.total)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs uppercase tracking-wide">Artículos</p>
                                    <p className="text-2xl font-bold text-gray-300">{request.items_count}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAttendBill(request)}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                                             font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 
                                             hover:from-green-400 hover:to-emerald-400 
                                             active:scale-95 transition-all shadow-lg shadow-green-500/30
                                             min-h-[48px]"
                                >
                                    <Check className="w-5 h-5" />
                                    Atender Mesa
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDismissBill(request.table_id)}
                                    className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 
                                             rounded-xl transition-all min-w-[48px] min-h-[48px] 
                                             flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Service Request Cards */}
            {pendingRequests.map(request => {
                const isDismissing = dismissing.has(request.id);

                return (
                    <div
                        key={request.id}
                        className={`
                            bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 
                            overflow-hidden transform transition-all duration-300
                            ${isDismissing ? 'scale-95 opacity-0 translate-x-full' : 'animate-slide-in-right'}
                            ${expandedRequest === request.id ? 'ring-2 ring-brand-500' : ''}
                        `}
                    >
                        {/* Header */}
                        <div
                            className={`bg-gradient-to-r ${getRequestColor(request.request_type)} 
                                      text-white px-4 py-3 flex items-center justify-between cursor-pointer`}
                            onClick={() => setExpandedRequest(
                                expandedRequest === request.id ? null : request.id
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    {getRequestIcon(request.request_type)}
                                </div>
                                <div>
                                    <div className="font-bold">Mesa {request.table_number}</div>
                                    <div className="text-xs opacity-90">{getRequestLabel(request.request_type)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm opacity-90">
                                <Clock className="w-4 h-4" />
                                {formatTime(request.created_at)}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {request.message && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                                    "{request.message}"
                                </p>
                            )}

                            {request.order_total && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-3">
                                    <span className="text-gray-500 text-sm">Total del pedido: </span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatPrice(request.order_total)}
                                    </span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResolve(request)}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                                             font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 
                                             hover:from-green-400 hover:to-emerald-400 
                                             active:scale-95 transition-all min-h-[48px]"
                                >
                                    <Check className="w-4 h-4" />
                                    Atender
                                </button>
                                <button
                                    onClick={() => clearRequest(request.id)}
                                    className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors
                                             min-w-[48px] min-h-[48px] flex items-center justify-center"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Summary Badge (when multiple requests) */}
            {totalPendingCount > 2 && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold 
                              px-4 py-2 rounded-full self-end shadow-lg shadow-orange-500/30 animate-bounce-soft">
                    🔔 {totalPendingCount} solicitudes pendientes
                </div>
            )}
        </div>
    );
}

// Add animations to globals.css or inline styles
const styles = `
@keyframes slide-in-right {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
}
`;

export default ServiceRequestPopup;
