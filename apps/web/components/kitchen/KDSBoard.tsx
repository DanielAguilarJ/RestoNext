"use client";

import { useEffect, useState } from "react";
import { useKDSStore } from "@/lib/store";
import { wsClient, mapDoc } from "@/lib/api";
import { cn, formatTimeElapsed, getTimerStatus } from "@/lib/utils";
import { Clock, Check, ChefHat } from "lucide-react";
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
                    id: order.id,
                    orderId: order.id,
                    tableNumber: order.table_number || 0, // Should be resolved or denormalized
                    items: order.items?.map((item: any) => ({
                        id: item.id || Math.random().toString(),
                        name: item.menu_item_name,
                        quantity: item.quantity,
                        modifiers: item.selected_modifiers?.map((m: any) => m.option_name) || [],
                        status: item.status as any,
                    })) || [],
                    createdAt: new Date(order.created_at),
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
        // Note: In production, we would also call ordersApi.updateItemStatus to persist
    };

    const getTimerMinutes = (createdAt: Date) => {
        return Math.floor((currentTime.getTime() - createdAt.getTime()) / 60000);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <ChefHat className="w-8 h-8 text-orange-500" />
                    <h1 className="text-2xl font-bold text-white">Cocina</h1>
                </div>
                <div className="text-gray-400">
                    {tickets.length} pedidos activos
                </div>
            </header>

            {/* Tickets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tickets.map((ticket) => {
                    const minutes = getTimerMinutes(ticket.createdAt);
                    const timerStatus = getTimerStatus(minutes);

                    return (
                        <div
                            key={ticket.id}
                            className={cn(
                                "rounded-xl overflow-hidden transition-all duration-300",
                                timerStatus === "critical" && "animate-pulse"
                            )}
                        >
                            {/* Ticket Header */}
                            <div
                                className={cn(
                                    "px-4 py-3 flex items-center justify-between",
                                    timerStatus === "normal" && "bg-blue-600",
                                    timerStatus === "warning" && "bg-amber-500",
                                    timerStatus === "critical" && "bg-red-600"
                                )}
                            >
                                <span className="text-white font-bold text-lg">
                                    Mesa {ticket.tableNumber}
                                </span>
                                <div className="flex items-center gap-2 text-white">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-mono font-bold">
                                        {formatTimeElapsed(ticket.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Ticket Items */}
                            <div className="bg-white dark:bg-gray-800 p-4 space-y-3">
                                {ticket.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(ticket.id, item.id, item.status)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg transition-all duration-200",
                                            "border-2 active:scale-95",
                                            item.status === "pending" && "bg-gray-100 border-gray-300",
                                            item.status === "preparing" && "bg-orange-100 border-orange-400",
                                            item.status === "ready" && "bg-green-100 border-green-500"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-lg">
                                                    {item.quantity}x
                                                </span>{" "}
                                                <span className="text-gray-900 dark:text-gray-100">
                                                    {item.name}
                                                </span>
                                            </div>
                                            {item.status === "ready" && (
                                                <Check className="w-6 h-6 text-green-600" />
                                            )}
                                        </div>

                                        {/* Modifiers */}
                                        {item.modifiers.length > 0 && (
                                            <div className="mt-1 text-sm text-gray-600">
                                                {item.modifiers.join(", ")}
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="mt-2 text-xs font-medium uppercase tracking-wide">
                                            {item.status === "pending" && (
                                                <span className="text-gray-500">Pendiente</span>
                                            )}
                                            {item.status === "preparing" && (
                                                <span className="text-orange-600">Preparando...</span>
                                            )}
                                            {item.status === "ready" && (
                                                <span className="text-green-600">¡Listo!</span>
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
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <UtensilsCrossed className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">No hay pedidos pendientes</p>
                </div>
            )}
        </div>
    );
}

// Helper icons that were missing
function UtensilsCrossed({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
            <path d="M15 15 3.3 3.3a2 2 0 0 0-2.8 2.8L12.1 17.7a2 2 0 0 0 2.8 0l1.4-1.4a2 2 0 0 0 0-2.8Z" />
            <path d="m2 16 2.3 2.3a3 3 0 0 0 4.2 0l1.8-1.8a3 3 0 0 0 0-4.2L8 10" />
        </svg>
    )
}
