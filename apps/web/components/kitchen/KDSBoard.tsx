"use client";

/**
 * KDSBoard - Kitchen Display System Board
 *
 * Complete kitchen flow:
 * - Orders arrive with per-item prep time countdowns
 * - Warning & critical alerts (sound + vibration)
 * - Click items to cycle status: pending -> preparing -> ready
 * - "Bump" button to complete & remove entire ticket
 * - Auto-removal when backend sends order_complete
 * - Configurable thresholds per tenant
 */

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useKDSStore } from "@/lib/store";
import type { KDSTicket } from "@/lib/store";
import { useKitchenSocket } from "@/hooks/useKitchenSocket";
import { kdsApi, KDSConfig } from "@/lib/api";
import { cn, formatTimeElapsed } from "@/lib/utils";
import {
    Clock, Check, ChefHat, ArrowLeft, Flame, Bell, Sparkles,
    Wifi, WifiOff, RefreshCw, Volume2, VolumeX, Send
} from "lucide-react";

const DEFAULT_CONFIG: KDSConfig = {
    mode: "restaurant",
    warning_minutes: 5,
    critical_minutes: 10,
    audio_alerts: true,
    shake_animation: true,
    auto_complete_when_ready: true,
};

function getTimerStatus(
    minutes: number,
    config: KDSConfig
): "normal" | "warning" | "critical" {
    if (minutes >= config.critical_minutes) return "critical";
    if (minutes >= config.warning_minutes) return "warning";
    return "normal";
}

function getItemTimeRemaining(createdAt: Date, prepMinutes: number): {
    remaining: number;
    overdue: boolean;
    label: string;
} {
    const elapsed = (Date.now() - createdAt.getTime()) / 60000;
    const remaining = Math.ceil(prepMinutes - elapsed);
    const overdue = remaining <= 0;
    const absMin = Math.abs(remaining);
    const label = overdue ? `+${absMin}m` : `${remaining}m`;
    return { remaining, overdue, label };
}

export function KDSBoard() {
    const { tickets, addTicket, updateItemStatus, setTickets, removeTicket } =
        useKDSStore();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [config, setConfig] = useState<KDSConfig>(DEFAULT_CONFIG);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [bumpingOrders, setBumpingOrders] = useState<Set<string>>(new Set());
    const audioContextRef = useRef<AudioContext | null>(null);
    const criticalOrdersPlayedRef = useRef<Set<string>>(new Set());
    const overdueItemsPlayedRef = useRef<Set<string>>(new Set());

    const {
        isConnected,
        connectionError,
        reconnectAttempts,
        connect,
        disconnect,
    } = useKitchenSocket({
        autoConnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
    });

    // Transform API orders to ticket format
    const transformOrders = useCallback((orders: any[]): KDSTicket[] => {
        return orders.map((order: any) => ({
            id: order.id,
            orderId: order.id,
            tableNumber: order.table_number ?? 0,
            orderNumber: order.order_number ?? "",
            orderSource: order.order_source ?? "pos",
            maxPrepTimeMinutes: order.max_prep_time_minutes ?? 15,
            notes: order.notes ?? undefined,
            items: (order.items || []).map((item: any) => ({
                id: item.id,
                name: item.name || item.menu_item_name,
                quantity: item.quantity,
                modifiers:
                    item.modifiers
                        ? (Array.isArray(item.modifiers)
                            ? item.modifiers.map((m: any) => (typeof m === 'string' ? m : m.option_name || m.name || String(m)))
                            : [])
                        : item.selected_modifiers?.map((m: any) => m.option_name || m.name || String(m)) ||
                          [],
                notes: item.notes,
                status: item.status || "pending",
                prep_time_minutes: item.prep_time_minutes ?? 15,
            })),
            createdAt: order.paid_at
                ? new Date(order.paid_at)
                : new Date(order.created_at),
        }));
    }, []);

    // Load config + initial orders
    useEffect(() => {
        async function loadInitialData() {
            setIsLoadingConfig(true);
            try {
                const kdsConfig = await kdsApi.getConfig();
                setConfig(kdsConfig);
                setAudioEnabled(kdsConfig.audio_alerts);
                const orders = await kdsApi.getOrders();
                setTickets(transformOrders(orders));
            } catch (error) {
                console.error("Failed to load KDS data:", error);
            } finally {
                setIsLoadingConfig(false);
            }
        }
        loadInitialData();
    }, [setTickets, transformOrders]);

    // Poll every 10s as WS fallback
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const orders = await kdsApi.getOrders();
                const fresh = transformOrders(orders);
                setTickets((prev: KDSTicket[]) => {
                    const prevIds = new Set(prev.map((t) => t.id));
                    const freshIds = new Set(fresh.map((t) => t.id));
                    const hasChanges =
                        fresh.length !== prev.length ||
                        fresh.some((t) => !prevIds.has(t.id)) ||
                        prev.some((t) => !freshIds.has(t.id));
                    return hasChanges ? fresh : prev;
                });
            } catch {
                // Silent fallback
            }
        }, 10000);
        return () => clearInterval(pollInterval);
    }, [transformOrders, setTickets]);

    // Timer tick every second
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Audio alert for critical orders
    useEffect(() => {
        if (!config.audio_alerts || !audioEnabled) return;
        tickets.forEach((ticket) => {
            const minutes = Math.floor(
                (currentTime.getTime() - ticket.createdAt.getTime()) / 60000
            );
            const status = getTimerStatus(minutes, config);
            if (
                status === "critical" &&
                !criticalOrdersPlayedRef.current.has(ticket.id)
            ) {
                playCriticalAlert();
                triggerVibration([300, 100, 300, 100, 300]);
                criticalOrdersPlayedRef.current.add(ticket.id);
            }
            // Per-item overdue alerts
            ticket.items.forEach((item) => {
                if (item.status === "ready") return;
                const key = `${ticket.id}-${item.id}`;
                const info = getItemTimeRemaining(
                    ticket.createdAt,
                    item.prep_time_minutes
                );
                if (info.overdue && !overdueItemsPlayedRef.current.has(key)) {
                    playOverdueItemAlert();
                    triggerVibration([200, 80, 200]);
                    overdueItemsPlayedRef.current.add(key);
                }
            });
        });
    }, [currentTime, tickets, config, audioEnabled]);

    // Sound helpers
    const getAudioCtx = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const playCriticalAlert = useCallback(() => {
        try {
            const ctx = getAudioCtx();
            const now = ctx.currentTime;
            const playTone = (freq: number, start: number, dur: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = "square";
                gain.gain.value = 0.35;
                osc.start(start);
                osc.stop(start + dur);
            };
            playTone(880, now, 0.12);
            playTone(660, now + 0.15, 0.12);
            playTone(880, now + 0.3, 0.12);
            playTone(660, now + 0.45, 0.12);
        } catch {
            /* silent */
        }
    }, [getAudioCtx]);

    const playOverdueItemAlert = useCallback(() => {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 440;
            osc.type = "triangle";
            gain.gain.value = 0.2;
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch {
            /* silent */
        }
    }, [getAudioCtx]);

    // Handle item click -> cycle status
    const handleItemClick = async (
        ticketId: string,
        itemId: string,
        currentStatus: string
    ) => {
        const nextStatus =
            currentStatus === "pending"
                ? "preparing"
                : currentStatus === "preparing"
                    ? "ready"
                    : null;
        if (!nextStatus) return; // Already ready, no further cycling

        updateItemStatus(
            ticketId,
            itemId,
            nextStatus as "pending" | "preparing" | "ready"
        );

        try {
            await kdsApi.updateItemStatus(itemId, nextStatus);
        } catch (error) {
            console.error("Failed to update item status:", error);
            updateItemStatus(
                ticketId,
                itemId,
                currentStatus as "pending" | "preparing" | "ready"
            );
        }
    };

    // Bump (complete) entire order
    const handleBumpOrder = async (ticketId: string) => {
        setBumpingOrders((prev) => new Set(prev).add(ticketId));
        try {
            await kdsApi.completeOrder(ticketId);
            // Wait a moment for the animation, then remove
            setTimeout(() => {
                removeTicket(ticketId);
                setBumpingOrders((prev) => {
                    const next = new Set(prev);
                    next.delete(ticketId);
                    return next;
                });
            }, 400);
        } catch (error) {
            console.error("Failed to complete order:", error);
            setBumpingOrders((prev) => {
                const next = new Set(prev);
                next.delete(ticketId);
                return next;
            });
        }
    };

    const getTimerMinutes = (createdAt: Date) =>
        Math.floor((currentTime.getTime() - createdAt.getTime()) / 60000);

    const handleManualReconnect = () => {
        disconnect();
        setTimeout(connect, 100);
    };

    const toggleAudio = () => {
        setAudioEnabled((prev) => !prev);
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }
    };

    // Check if all items in a ticket are ready
    const allItemsReady = (ticket: KDSTicket) =>
        ticket.items.length > 0 && ticket.items.every((i) => i.status === "ready");

    if (isLoadingConfig) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <ChefHat className="w-12 h-12 text-orange-500 animate-pulse" />
                    <p className="text-gray-400">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-orange-500 rounded-full animate-pulse opacity-50" />
                <div
                    className="absolute top-40 right-20 w-3 h-3 bg-red-500 rounded-full animate-pulse opacity-50"
                    style={{ animationDelay: "0.5s" }}
                />
                <div
                    className="absolute bottom-32 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-pulse opacity-50"
                    style={{ animationDelay: "1s" }}
                />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-3 glass-dark rounded-xl text-gray-400 hover:text-white transition-all duration-300 hover:scale-105"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse-glow">
                            <ChefHat className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                Cocina
                                <Flame className="w-5 h-5 text-orange-500" />
                            </h1>
                            <p className="text-sm text-gray-400">
                                {config.mode === "cafeteria"
                                    ? "Modo Cafetería"
                                    : "Modo Restaurante"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleAudio}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            audioEnabled
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-gray-700/50 text-gray-500"
                        )}
                        title={audioEnabled ? "Silenciar alertas" : "Activar alertas"}
                    >
                        {audioEnabled ? (
                            <Volume2 className="w-5 h-5" />
                        ) : (
                            <VolumeX className="w-5 h-5" />
                        )}
                    </button>

                    <div
                        className={cn(
                            "glass-dark rounded-xl px-4 py-2 flex items-center gap-2 transition-all duration-300",
                            isConnected
                                ? "border border-green-500/30"
                                : "border border-red-500/30"
                        )}
                    >
                        {isConnected ? (
                            <>
                                <Wifi className="w-5 h-5 text-green-500" />
                                <span className="text-green-400 text-sm font-medium">
                                    Conectado
                                </span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-5 h-5 text-red-500" />
                                <span className="text-red-400 text-sm font-medium">
                                    {reconnectAttempts > 0
                                        ? `Reconectando... (${reconnectAttempts})`
                                        : "Desconectado"}
                                </span>
                                <button
                                    onClick={handleManualReconnect}
                                    className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Reconectar manualmente"
                                >
                                    <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="glass-dark rounded-xl px-4 py-2 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-500" />
                        <span className="text-white font-bold">{tickets.length}</span>
                        <span className="text-gray-400 text-sm">pedidos</span>
                    </div>
                </div>
            </header>

            {/* Connection Error Banner */}
            {connectionError && (
                <div className="relative z-10 mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between">
                    <span className="text-red-300">{connectionError}</span>
                    <button
                        onClick={handleManualReconnect}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            )}

            {/* Tickets Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tickets.map((ticket, ticketIndex) => {
                    const minutes = getTimerMinutes(ticket.createdAt);
                    const timerStatus = getTimerStatus(minutes, config);
                    const isBumping = bumpingOrders.has(ticket.id);
                    const isAllReady = allItemsReady(ticket);

                    return (
                        <div
                            key={ticket.id}
                            className={cn(
                                "rounded-2xl overflow-hidden transition-all duration-300 animate-scale-in",
                                "shadow-xl hover:shadow-2xl",
                                timerStatus === "critical" &&
                                    config.shake_animation &&
                                    "animate-shake ring-2 ring-red-500/50",
                                isBumping && "opacity-0 scale-90 transition-all duration-400",
                                isAllReady && "ring-2 ring-green-500/60"
                            )}
                            style={{ animationDelay: `${ticketIndex * 0.1}s` }}
                        >
                            {/* Ticket Header */}
                            <div
                                className={cn(
                                    "px-4 py-3 flex items-center justify-between",
                                    isAllReady
                                        ? "bg-gradient-to-r from-green-600 to-emerald-600"
                                        : timerStatus === "normal"
                                            ? "bg-gradient-to-r from-blue-600 to-blue-700"
                                            : timerStatus === "warning"
                                                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                                : "bg-gradient-to-r from-red-500 to-red-600"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-lg">
                                        {ticket.tableNumber === 0
                                            ? "Mostrador"
                                            : `Mesa ${ticket.tableNumber}`}
                                    </span>
                                    {ticket.orderNumber && (
                                        <span className="text-white/70 text-xs font-mono">
                                            {ticket.orderNumber}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {timerStatus === "critical" && !isAllReady && (
                                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold text-white animate-pulse">
                                            ¡URGENTE!
                                        </span>
                                    )}
                                    {isAllReady && (
                                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold text-white">
                                            ✓ LISTO
                                        </span>
                                    )}
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-full text-white",
                                            timerStatus === "critical" && !isAllReady
                                                ? "bg-white/20 animate-pulse"
                                                : "bg-white/10"
                                        )}
                                    >
                                        <Clock className="w-4 h-4" />
                                        <span className="font-mono font-bold">
                                            {formatTimeElapsed(ticket.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Notes */}
                            {ticket.notes && (
                                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
                                    <p className="text-amber-300 text-sm">
                                        <span className="font-semibold">📝 Nota:</span> {ticket.notes}
                                    </p>
                                </div>
                            )}

                            {/* Ticket Items */}
                            <div className="bg-gray-800 p-4 space-y-2">
                                {ticket.items.map((item, itemIndex) => {
                                    const itemTime = getItemTimeRemaining(
                                        ticket.createdAt,
                                        item.prep_time_minutes
                                    );
                                    const isItemOverdue =
                                        itemTime.overdue && item.status !== "ready";

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() =>
                                                handleItemClick(ticket.id, item.id, item.status)
                                            }
                                            disabled={item.status === "ready"}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl transition-all duration-300",
                                                "border-2 active:scale-[0.98] animate-slide-up",
                                                item.status === "pending" &&
                                                    "bg-gray-700/50 border-gray-600 hover:border-gray-500",
                                                item.status === "preparing" &&
                                                    "bg-orange-500/20 border-orange-500 hover:bg-orange-500/30",
                                                item.status === "ready" &&
                                                    "bg-green-500/20 border-green-500 cursor-default",
                                                isItemOverdue && "border-red-500 bg-red-500/10"
                                            )}
                                            style={{ animationDelay: `${itemIndex * 0.05}s` }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            "text-xl font-black px-2 py-0.5 rounded",
                                                            item.status === "pending" &&
                                                                "bg-gray-600 text-gray-300",
                                                            item.status === "preparing" &&
                                                                "bg-orange-500 text-white",
                                                            item.status === "ready" &&
                                                                "bg-green-500 text-white"
                                                        )}
                                                    >
                                                        {item.quantity}x
                                                    </span>
                                                    <span className="text-white font-semibold text-lg">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Per-item prep time countdown */}
                                                    {item.status !== "ready" && (
                                                        <span
                                                            className={cn(
                                                                "text-xs font-mono px-2 py-1 rounded-full",
                                                                isItemOverdue
                                                                    ? "bg-red-500/30 text-red-300 animate-pulse"
                                                                    : "bg-gray-600/50 text-gray-400"
                                                            )}
                                                        >
                                                            {itemTime.label}
                                                        </span>
                                                    )}
                                                    {item.status === "ready" && (
                                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                                                            <Check className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {item.modifiers.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {item.modifiers.map(
                                                        (mod: string, i: number) => (
                                                            <span
                                                                key={i}
                                                                className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300"
                                                            >
                                                                {mod}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {item.notes && (
                                                <div className="mt-2 text-sm text-yellow-400 italic">
                                                    📝 {item.notes}
                                                </div>
                                            )}

                                            <div className="mt-3 text-xs font-semibold uppercase tracking-wider">
                                                {item.status === "pending" && (
                                                    <span className="text-gray-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                                        Pendiente - Toca para iniciar
                                                    </span>
                                                )}
                                                {item.status === "preparing" && (
                                                    <span className="text-orange-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                                        Preparando... - Toca cuando esté listo
                                                    </span>
                                                )}
                                                {item.status === "ready" && (
                                                    <span className="text-green-400 flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" />
                                                        ¡Listo para servir!
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {/* BUMP / Complete button */}
                                <button
                                    onClick={() => handleBumpOrder(ticket.id)}
                                    disabled={isBumping}
                                    className={cn(
                                        "w-full mt-3 py-3 rounded-xl font-bold text-sm uppercase tracking-wider",
                                        "transition-all duration-300 flex items-center justify-center gap-2",
                                        isAllReady
                                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30 animate-pulse"
                                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600",
                                        isBumping && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Send className="w-4 h-4" />
                                    {isAllReady ? "¡Entregar Pedido!" : "Completar y Entregar"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {tickets.length === 0 && (
                <div className="relative z-10 flex flex-col items-center justify-center h-[60vh] text-gray-500">
                    <div className="w-24 h-24 bg-gray-800 rounded-3xl flex items-center justify-center mb-6 animate-bounce-soft">
                        <ChefHat className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-xl font-medium text-gray-400 mb-2">
                        Sin pedidos pendientes
                    </p>
                    <p className="text-gray-500 mb-4">
                        {config.mode === "cafeteria"
                            ? "Los pedidos pagados aparecerán aquí automáticamente"
                            : "Los nuevos pedidos aparecerán aquí automáticamente"}
                    </p>
                    <div
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg",
                            isConnected
                                ? "bg-green-500/10 text-green-400"
                                : "bg-yellow-500/10 text-yellow-400"
                        )}
                    >
                        {isConnected ? (
                            <>
                                <Wifi className="w-4 h-4" />
                                <span className="text-sm">Escuchando nuevos pedidos...</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" />
                                <span className="text-sm">Conectando al servidor...</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Vibration helper
function triggerVibration(pattern: number[]) {
    try {
        if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
        /* not supported */
    }
}
