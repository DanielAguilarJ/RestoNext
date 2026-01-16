"use client";

/**
 * Table Map Component
 * Premium visual grid of restaurant tables with color-coded status
 * Supports real-time status updates via WebSocket
 * 
 * Status Colors:
 * 🟢 Libre (free) - Green
 * 🔴 Ocupada (occupied) - Red  
 * 🟡 Esperando Pago (bill_requested) - Yellow/Amber - Animated pulse
 * 🔵 Solicitando Ayuda (service_requested) - Blue - Animated pulse
 */

import { useEffect, useCallback } from 'react';
import { usePOSStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Users, Utensils, Clock, AlertCircle, Receipt, Bell, Zap } from "lucide-react";
import {
    useServiceSocket,
    TableStatusNotification,
    BillRequestNotification,
    ServiceRequestNotification
} from '@/hooks/useServiceSocket';
import { tablesApi } from '@/lib/api';
import { TableStatus } from '../../../../packages/shared/src/index';

interface TableMapProps {
    onTableSelect?: (tableId: string) => void;
    autoRefresh?: boolean;
    /** Tables with pending offline orders */
    pendingTables?: Set<string>;
}

export function TableMap({ onTableSelect, autoRefresh = true, pendingTables = new Set() }: TableMapProps) {
    const { tables, selectedTable, setSelectedTable, setTables, updateTableStatus } = usePOSStore();

    // Check if table has pending sync (offline queued orders)
    const hasPendingSync = (tableId: string) => {
        return pendingTables.has(tableId);
    };

    // Real-time table status via WebSocket
    const { pendingBillRequests, isConnected } = useServiceSocket({
        playSound: false, // TableMap doesn't play sounds, only updates visuals
        onTableStatusChange: useCallback((status: TableStatusNotification) => {
            console.log('📊 Table status change:', status);
            updateTableStatus(status.table_id, status.status as TableStatus);
        }, [updateTableStatus]),
        onBillRequest: useCallback((bill: BillRequestNotification) => {
            console.log('💵 Bill requested for table:', bill.table_number);
            updateTableStatus(bill.table_id, 'bill_requested');
        }, [updateTableStatus]),
        onServiceRequest: useCallback((request: ServiceRequestNotification) => {
            console.log('🔔 Service request from table:', request.table_number);
            if (request.request_type === 'waiter') {
                updateTableStatus(request.table_id, 'service_requested');
            }
        }, [updateTableStatus])
    });

    // Load tables from API on mount
    useEffect(() => {
        async function loadTables() {
            try {
                const apiTables = await tablesApi.list();
                if (apiTables && apiTables.length > 0) {
                    setTables(apiTables as any);
                }
            } catch (error) {
                console.error('Failed to load tables:', error);
                // Keep demo tables if API fails
            }
        }

        if (autoRefresh) {
            loadTables();
        }
    }, [autoRefresh, setTables]);

    const handleTableClick = (table: any) => {
        setSelectedTable(table);
        onTableSelect?.(table.$id || table.id);
    };

    // Check if table has pending bill request
    const hasPendingBill = (tableId: string) => {
        return pendingBillRequests.some(r => r.table_id === tableId);
    };

    // Get effective status (combines stored status with real-time alerts)
    const getEffectiveStatus = (table: any) => {
        if (hasPendingBill(table.id || table.$id)) {
            return 'bill_requested';
        }
        return table.status;
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "free":
                return {
                    container: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-400 hover:border-green-500 shadow-green-500/20",
                    icon: "text-green-600",
                    text: "text-green-700 dark:text-green-400",
                    badge: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                    glow: "",
                };
            case "occupied":
                return {
                    container: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-400 hover:border-red-500 shadow-red-500/20",
                    icon: "text-red-600",
                    text: "text-red-700 dark:text-red-400",
                    badge: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
                    glow: "",
                };
            case "bill_requested":
                return {
                    container: "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/40 dark:to-amber-800/40 border-yellow-400 hover:border-yellow-500 shadow-yellow-500/30 animate-pulse-soft",
                    icon: "text-yellow-600",
                    text: "text-yellow-700 dark:text-yellow-400",
                    badge: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white animate-bounce-soft",
                    glow: "ring-4 ring-yellow-400/50 ring-offset-2",
                };
            case "service_requested":
                return {
                    container: "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-900/40 dark:to-sky-800/40 border-blue-400 hover:border-blue-500 shadow-blue-500/30 animate-pulse-soft",
                    icon: "text-blue-600",
                    text: "text-blue-700 dark:text-blue-400",
                    badge: "bg-gradient-to-r from-blue-500 to-sky-500 text-white animate-bounce-soft",
                    glow: "ring-4 ring-blue-400/50 ring-offset-2",
                };
            case "reserved":
                return {
                    container: "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/30 border-purple-400 hover:border-purple-500 shadow-purple-500/20",
                    icon: "text-purple-600",
                    text: "text-purple-700 dark:text-purple-400",
                    badge: "bg-gradient-to-r from-purple-500 to-violet-500 text-white",
                    glow: "",
                };
            case "pending_sync":
                return {
                    container: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/40 dark:to-amber-800/40 border-orange-400 hover:border-orange-500 shadow-orange-500/30 animate-pulse-soft",
                    icon: "text-orange-600",
                    text: "text-orange-700 dark:text-orange-400",
                    badge: "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
                    glow: "ring-4 ring-orange-400/50 ring-offset-2",
                };
            default:
                return {
                    container: "bg-gray-50 border-gray-300",
                    icon: "text-gray-400",
                    text: "text-gray-500",
                    badge: "bg-gray-500 text-white",
                    glow: "",
                };
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "free":
                return "Libre";
            case "occupied":
                return "Ocupada";
            case "bill_requested":
                return "Pide Cuenta";
            case "service_requested":
                return "Llama Mesero";
            case "reserved":
                return "Reservada";
            case "pending_sync":
                return "Sincronizando";
            default:
                return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "free":
                return <Utensils className="w-4 h-4" />;
            case "occupied":
                return <Clock className="w-4 h-4" />;
            case "bill_requested":
                return <Receipt className="w-4 h-4" />;
            case "service_requested":
                return <Bell className="w-4 h-4" />;
            case "reserved":
                return <Clock className="w-4 h-4" />;
            case "pending_sync":
                return <Zap className="w-4 h-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4">
            {/* Live Indicator */}
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                    isConnected
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    )} />
                    {isConnected ? 'Sincronizado en vivo' : 'Reconectando...'}
                    {isConnected && <Zap className="w-3 h-3" />}
                </div>

                {pendingBillRequests.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium animate-pulse">
                        <Receipt className="w-3 h-3" />
                        {pendingBillRequests.length} mesa(s) pidiendo cuenta
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="glass rounded-xl p-4 mb-6 animate-fade-in">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Estado de mesas</p>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-md shadow-green-500/30" />
                        <span className="text-gray-700 dark:text-gray-300">Libre</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-red-400 to-red-600 shadow-md shadow-red-500/30" />
                        <span className="text-gray-700 dark:text-gray-300">Ocupada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-500/30 animate-pulse" />
                        <span className="text-gray-700 dark:text-gray-300">Pide Cuenta</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-400 to-sky-500 shadow-md shadow-blue-500/30 animate-pulse" />
                        <span className="text-gray-700 dark:text-gray-300">Llama Mesero</span>
                    </div>
                </div>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-3 gap-4">
                {tables.map((table, index) => {
                    const tableId = (table as any).$id || table.id;
                    const isPendingSync = hasPendingSync(tableId);
                    const effectiveStatus = isPendingSync ? 'pending_sync' : getEffectiveStatus(table);
                    const styles = getStatusStyles(effectiveStatus);
                    const isUrgent = effectiveStatus === 'bill_requested' || effectiveStatus === 'service_requested' || isPendingSync;

                    return (
                        <button
                            key={(table as any).$id || table.id}
                            onClick={() => handleTableClick(table)}
                            className={cn(
                                // Base styles - FAT FINGER FRIENDLY (min 48x48)
                                "relative aspect-square rounded-2xl p-4 transition-all duration-300",
                                "flex flex-col items-center justify-center",
                                "active:scale-95 touch-manipulation min-h-[100px] min-w-[100px]",
                                // Border and shadow
                                "border-2 shadow-lg hover:shadow-xl hover:-translate-y-1",
                                // Status-specific styles
                                styles.container,
                                styles.glow,
                                // Selection indicator
                                selectedTable?.$id === (table as any).$id && "ring-4 ring-brand-500 ring-offset-2 scale-105",
                                // Animation
                                "animate-scale-in"
                            )}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* Urgent Indicator (top-left) */}
                            {isUrgent && (
                                <div className="absolute -top-1 -left-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-yellow-500 text-xs animate-ping absolute">⚡</span>
                                    <span className="text-yellow-500 text-xs">⚡</span>
                                </div>
                            )}

                            {/* Table Number */}
                            <span className={cn(
                                "text-4xl font-black transition-transform duration-300",
                                styles.text,
                                "group-hover:scale-110"
                            )}>
                                {table.number}
                            </span>

                            {/* Capacity */}
                            <div className={cn(
                                "flex items-center gap-1.5 mt-2 text-sm font-medium",
                                styles.icon
                            )}>
                                <Users className="w-4 h-4" />
                                <span>{table.capacity} personas</span>
                            </div>

                            {/* Status Badge */}
                            <span className={cn(
                                "absolute -bottom-2 left-1/2 -translate-x-1/2",
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                "shadow-md flex items-center gap-1.5",
                                styles.badge
                            )}>
                                {getStatusIcon(effectiveStatus)}
                                {getStatusLabel(effectiveStatus)}
                            </span>

                            {/* Selection indicator */}
                            {selectedTable?.$id === (table as any).$id && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-soft">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                            )}

                            {/* Ripple Effect Container */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                <div className="ripple-effect" />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Empty State */}
            {tables.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No hay mesas configuradas</p>
                    <p className="text-sm">Agrega mesas desde el panel de administración</p>
                </div>
            )}
        </div>
    );
}
