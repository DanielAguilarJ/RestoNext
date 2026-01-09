"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useKDSStore } from "@/lib/store";
import { wsClient, mapDoc } from "@/lib/api";
import { cn, formatTimeElapsed, getTimerStatus } from "@/lib/utils";
import { Clock, Check, ChefHat, ArrowLeft, Flame, Bell, Sparkles } from "lucide-react";
import { Order, OrderItem } from "../../../../packages/shared/src/index";

export function KDSBoard() {
    const { tickets, addTicket, updateItemStatus, setTickets } = useKDSStore();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update timer every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Connect to Appwrite Realtime for new orders and item updates
    useEffect(() => {
        const unsubscribe = wsClient.subscribe("orders", (response: any) => {
            if (response.events.some((e: string) => e.includes(".create"))) {
                const order = mapDoc<Order>(response.payload);
                addTicket({
                    id: order.$id,
                    orderId: order.$id,
                    tableNumber: order.table_number || 0,
                    items: order.items?.map((item: any) => ({
                        id: item.id || Math.random().toString(),
                        name: item.name,
                        quantity: item.quantity,
                        modifiers: item.selected_modifiers?.map((m: any) => m.option) || [],
                        status: item.status as any,
                    })) || [],
                    createdAt: new Date(order.created_at || order.$createdAt),
                });
            }
        });

        return () => {
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, []);

    const handleItemClick = (ticketId: string, itemId: string, currentStatus: string) => {
        const nextStatus = currentStatus === "pending"
            ? "preparing"
            : currentStatus === "preparing"
                ? "ready"
                : "pending";

        updateItemStatus(ticketId, itemId, nextStatus as "pending" | "preparing" | "ready");
    };

    const getTimerMinutes = (createdAt: Date) => {
        return Math.floor((currentTime.getTime() - createdAt.getTime()) / 60000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-orange-500 rounded-full animate-pulse opacity-50" />
                <div className="absolute top-40 right-20 w-3 h-3 bg-red-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
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
                            <p className="text-sm text-gray-400">Kitchen Display System</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                    <div className="glass-dark rounded-xl px-4 py-2 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-500" />
                        <span className="text-white font-bold">{tickets.length}</span>
                        <span className="text-gray-400 text-sm">pedidos</span>
                    </div>
                </div>
            </header>

            {/* Tickets Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tickets.map((ticket, ticketIndex) => {
                    const minutes = getTimerMinutes(ticket.createdAt);
                    const timerStatus = getTimerStatus(minutes);

                    return (
                        <div
                            key={ticket.id}
                            className={cn(
                                "rounded-2xl overflow-hidden transition-all duration-300 animate-scale-in",
                                "shadow-xl hover:shadow-2xl",
                                timerStatus === "critical" && "animate-border-glow ring-2 ring-red-500/50"
                            )}
                            style={{ animationDelay: `${ticketIndex * 0.1}s` }}
                        >
                            {/* Ticket Header */}
                            <div
                                className={cn(
                                    "px-4 py-3 flex items-center justify-between",
                                    timerStatus === "normal" && "bg-gradient-to-r from-blue-600 to-blue-700",
                                    timerStatus === "warning" && "bg-gradient-to-r from-amber-500 to-orange-500",
                                    timerStatus === "critical" && "bg-gradient-to-r from-red-500 to-red-600"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-bold text-lg">
                                        Mesa {ticket.tableNumber}
                                    </span>
                                    {timerStatus === "critical" && (
                                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold text-white animate-pulse">
                                            ¡URGENTE!
                                        </span>
                                    )}
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1 rounded-full text-white",
                                    timerStatus === "critical" ? "bg-white/20 animate-pulse" : "bg-white/10"
                                )}>
                                    <Clock className="w-4 h-4" />
                                    <span className="font-mono font-bold">
                                        {formatTimeElapsed(ticket.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Ticket Items */}
                            <div className="bg-gray-800 p-4 space-y-2">
                                {ticket.items.map((item, itemIndex) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(ticket.id, item.id, item.status)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl transition-all duration-300",
                                            "border-2 active:scale-[0.98] animate-slide-up",
                                            item.status === "pending" && "bg-gray-700/50 border-gray-600 hover:border-gray-500",
                                            item.status === "preparing" && "bg-orange-500/20 border-orange-500 hover:bg-orange-500/30",
                                            item.status === "ready" && "bg-green-500/20 border-green-500"
                                        )}
                                        style={{ animationDelay: `${itemIndex * 0.05}s` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-xl font-black px-2 py-0.5 rounded",
                                                    item.status === "pending" && "bg-gray-600 text-gray-300",
                                                    item.status === "preparing" && "bg-orange-500 text-white",
                                                    item.status === "ready" && "bg-green-500 text-white"
                                                )}>
                                                    {item.quantity}x
                                                </span>
                                                <span className="text-white font-semibold text-lg">
                                                    {item.name}
                                                </span>
                                            </div>
                                            {item.status === "ready" && (
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                                                    <Check className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Modifiers */}
                                        {item.modifiers.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {item.modifiers.map((mod, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300">
                                                        {mod}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Status Badge */}
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
                                ))}
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
                    <p className="text-xl font-medium text-gray-400 mb-2">Sin pedidos pendientes</p>
                    <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
                </div>
            )}
        </div>
    );
}
