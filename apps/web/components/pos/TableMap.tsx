"use client";

/**
 * Table Map Component
 * Premium visual grid of restaurant tables with color-coded status
 */

import { usePOSStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Users, Utensils, Clock, AlertCircle } from "lucide-react";

interface TableMapProps {
    onTableSelect?: (tableId: string) => void;
}

export function TableMap({ onTableSelect }: TableMapProps) {
    const { tables, selectedTable, setSelectedTable } = usePOSStore();

    const handleTableClick = (table: any) => {
        setSelectedTable(table);
        onTableSelect?.(table.$id);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "free":
                return {
                    container: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-400 hover:border-green-500 shadow-green-500/20",
                    icon: "text-green-600",
                    text: "text-green-700 dark:text-green-400",
                    badge: "bg-green-500 text-white",
                };
            case "occupied":
                return {
                    container: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-400 hover:border-red-500 shadow-red-500/20",
                    icon: "text-red-600",
                    text: "text-red-700 dark:text-red-400",
                    badge: "bg-red-500 text-white",
                };
            case "bill_requested":
                return {
                    container: "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-800/30 border-yellow-400 hover:border-yellow-500 shadow-yellow-500/20 animate-pulse",
                    icon: "text-yellow-600",
                    text: "text-yellow-700 dark:text-yellow-400",
                    badge: "bg-yellow-500 text-white",
                };
            default:
                return {
                    container: "bg-gray-50 border-gray-300",
                    icon: "text-gray-400",
                    text: "text-gray-500",
                    badge: "bg-gray-500 text-white",
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
                return "Pide cuenta";
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
                return <AlertCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4">
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
                </div>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-3 gap-4">
                {tables.map((table, index) => {
                    const styles = getStatusStyles(table.status);

                    return (
                        <button
                            key={table.$id}
                            onClick={() => handleTableClick(table)}
                            className={cn(
                                "relative aspect-square rounded-2xl p-4 transition-all duration-300",
                                "flex flex-col items-center justify-center",
                                "active:scale-95 touch-target border-2",
                                "shadow-lg hover:shadow-xl hover:-translate-y-1",
                                styles.container,
                                selectedTable?.$id === table.$id && "ring-4 ring-brand-500 ring-offset-2 scale-105",
                                "animate-scale-in"
                            )}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
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
                                {getStatusIcon(table.status)}
                                {getStatusLabel(table.status)}
                            </span>

                            {/* Selection indicator */}
                            {selectedTable?.$id === table.$id && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-soft">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
