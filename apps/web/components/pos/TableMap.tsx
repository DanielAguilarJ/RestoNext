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
                    container: "bg-white/10 backdrop-blur-md border-white/20 shadow-lg shadow-black/5 hover:bg-white/15 hover:border-emerald-500/50 hover:shadow-emerald-500/20",
                    icon: "text-emerald-400",
                    text: "text-white font-medium",
                    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md",
                    glow: "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_30px_rgba(16,185,129,0.1)] after:pointer-events-none",
                };
            case "occupied":
                return {
                    container: "bg-red-500/10 backdrop-blur-md border-red-500/30 shadow-lg shadow-red-900/20 hover:bg-red-500/20 hover:border-red-500/50",
                    icon: "text-red-400",
                    text: "text-red-100 font-medium",
                    badge: "bg-red-500/20 text-red-300 border border-red-500/30 backdrop-blur-md",
                    glow: "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_30px_rgba(239,68,68,0.2)] after:pointer-events-none",
                };
            case "bill_requested":
                return {
                    container: "bg-amber-500/10 backdrop-blur-md border-amber-500/40 shadow-lg shadow-amber-900/20 animate-pulse-slow ring-1 ring-amber-500/30",
                    icon: "text-amber-400",
                    text: "text-amber-100 font-bold",
                    badge: "bg-amber-500 text-black border border-amber-400 font-bold animate-bounce-soft shadow-lg shadow-amber-500/50",
                    glow: "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_50px_rgba(245,158,11,0.3)] after:pointer-events-none ring-2 ring-amber-500/50 ring-offset-2 ring-offset-black/50",
                };
            case "service_requested":
                return {
                    container: "bg-blue-500/10 backdrop-blur-md border-blue-500/40 shadow-lg shadow-blue-900/20 animate-pulse-slow ring-1 ring-blue-500/30",
                    icon: "text-blue-400",
                    text: "text-blue-100 font-bold",
                    badge: "bg-blue-500 text-white border border-blue-400 font-bold animate-bounce-soft shadow-lg shadow-blue-500/50",
                    glow: "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_50px_rgba(59,130,246,0.3)] after:pointer-events-none ring-2 ring-blue-500/50 ring-offset-2 ring-offset-black/50",
                };
            case "reserved":
                return {
                    container: "bg-violet-500/5 backdrop-blur-md border-violet-500/20 shadow-lg shadow-black/10 grayscale-[0.5]",
                    icon: "text-violet-400",
                    text: "text-violet-200/70",
                    badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
                    glow: "",
                };
            case "pending_sync":
                return {
                    container: "bg-orange-500/10 backdrop-blur-md border-orange-500/30 border-dashed",
                    icon: "text-orange-400",
                    text: "text-orange-200",
                    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
                    glow: "",
                };
            default:
                return {
                    container: "bg-white/5 backdrop-blur-sm border-white/10",
                    icon: "text-zinc-500",
                    text: "text-zinc-500",
                    badge: "bg-zinc-500/20 text-zinc-500",
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
